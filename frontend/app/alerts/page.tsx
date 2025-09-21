"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, CheckCircle, Bell, Settings, Clock, X, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { NavBar } from "@/components/nav-bar"
import { TabBar } from "@/components/tab-bar"
import { VoiceMic } from "@/components/voice-mic"
import { useMotion } from "@/components/motion-provider"
import { useTheme } from "@/hooks/use-theme"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { getDosesToday, patchDose, type ApiDose } from "@/lib/api"

interface Alert {
  id: string
  type: "missed_dose" | "medication_reminder" | "adherence_warning" | "system"
  title: string
  message: string
  priority: "low" | "medium" | "high"
  status: "active" | "acknowledged"
  createdAt: string
  acknowledgedAt?: string
  medicationName?: string
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "active" | "acknowledged">("all")
  const { prefersReducedMotion, easing, durations } = useMotion()
  const { isDark } = useTheme()
  const { toast } = useToast()

  useEffect(() => {
    const load = async () => {
      try {
        const doses = await getDosesToday()
        const now = new Date()
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
        const graceMinutes = 10 // default if no escalation rule configured

        const toOverdueMinutes = (scheduledAtIso: string): number => {
          const scheduled = new Date(scheduledAtIso)
          const diffMs = now.getTime() - scheduled.getTime()
          return Math.floor(diffMs / 60000)
        }

        const priorityForOverdue = (mins: number): Alert["priority"] => {
          if (mins >= 60) return "high"
          if (mins >= 30) return "medium"
          return "low"
        }

        // Real data: build alerts from overdue pending doses (today only, local time)
        const startOfDay = new Date(now)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(now)
        endOfDay.setHours(23, 59, 59, 999)

        const overdueAlerts: Alert[] = doses
          .filter((d: ApiDose) => {
            const s = new Date(d.scheduled_at)
            return (
              d.status === "pending" &&
              s >= startOfDay &&
              s <= endOfDay &&
              toOverdueMinutes(d.scheduled_at) > graceMinutes
            )
          })
          .map((d: ApiDose) => {
            const mins = toOverdueMinutes(d.scheduled_at)
            const med = d.medication_name || "Medication"
            const scheduled = new Date(d.scheduled_at)
            const timeText = scheduled.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            return {
              id: d.id,
              type: "missed_dose" as const,
              title: "Missed Dose",
              message: `${med} dose scheduled for ${timeText} (${tz}) is overdue by ${mins} min`,
              priority: priorityForOverdue(mins),
              status: "active" as const,
              createdAt: d.scheduled_at,
              medicationName: med,
            }
          })

        // Upcoming reminders: pending doses due within next 60 minutes
        const upcomingAlerts: Alert[] = doses
          .filter((d: ApiDose) => {
            const s = new Date(d.scheduled_at)
            const diffMs = s.getTime() - now.getTime()
            const minsUntil = Math.floor(diffMs / 60000)
            return d.status === "pending" && minsUntil > 0 && minsUntil <= 60
          })
          .map((d: ApiDose) => {
            const s = new Date(d.scheduled_at)
            const minsUntil = Math.max(1, Math.floor((s.getTime() - now.getTime()) / 60000))
            const med = d.medication_name || "Medication"
            const timeText = s.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            return {
              id: d.id,
              type: "medication_reminder" as const,
              title: "Upcoming Dose",
              message: `${med} due at ${timeText} (${tz}) in ${minsUntil} min`,
              priority: minsUntil <= 15 ? (minsUntil <= 5 ? "high" : "medium") : "low",
              status: "active" as const,
              createdAt: d.scheduled_at,
              medicationName: med,
            }
          })

        // Adherence concern: in last 7 days, if missed (past and not taken) ≥ 3
        const sevenDaysAgo = new Date(now)
        sevenDaysAgo.setDate(now.getDate() - 7)
        const missedInWeek = doses.filter((d) => {
          const s = new Date(d.scheduled_at)
          return s >= sevenDaysAgo && s < now && d.status !== "taken"
        }).length
        const adherenceAlerts: Alert[] = missedInWeek >= 3
          ? [
              {
                id: `adherence-${now.getTime()}`,
                type: "adherence_warning" as const,
                title: "Adherence Concern",
                message: `You have ${missedInWeek} missed/unfinished doses in the last 7 days. Consider enabling more reminders.`,
                priority: missedInWeek >= 6 ? "high" : "medium",
                status: "active" as const,
                createdAt: now.toISOString(),
              } as Alert,
            ]
          : []

        setAlerts([...overdueAlerts, ...upcomingAlerts, ...adherenceAlerts])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const handleAcknowledge = async (alertId: string) => {
    // Persist change for dose-backed alerts
    try {
      const target = alerts.find((a) => a.id === alertId)
      if (target?.type === "missed_dose") {
        await patchDose(alertId, { status: "skipped" })
      } else if (target?.type === "medication_reminder") {
        await patchDose(alertId, { status: "snoozed" })
      }
    } catch {}
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId
          ? {
              ...alert,
              status: "acknowledged" as const,
              acknowledgedAt: new Date().toISOString(),
            }
          : alert,
      ),
    )
    toast({
      title: "Alert acknowledged",
      description: "The alert has been marked as resolved",
    })
  }

  const handleAcknowledgeAll = async () => {
    const activeAlerts = alerts.filter((alert) => alert.status === "active")
    if (activeAlerts.length === 0) return
    try {
      await Promise.all(
        activeAlerts.map((a) => {
          if (a.type === "missed_dose") return patchDose(a.id, { status: "skipped" })
          if (a.type === "medication_reminder") return patchDose(a.id, { status: "snoozed" })
          return Promise.resolve()
        }),
      )
    } catch {}
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.status === "active"
          ? {
              ...alert,
              status: "acknowledged" as const,
              acknowledgedAt: new Date().toISOString(),
            }
          : alert,
      ),
    )
    toast({
      title: "All alerts acknowledged",
      description: `${activeAlerts.length} alerts have been resolved`,
    })
  }

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === "active") return alert.status === "active"
    if (filter === "acknowledged") return alert.status === "acknowledged"
    return true
  })

  const activeAlerts = alerts.filter((alert) => alert.status === "active")
  const highPriorityAlerts = activeAlerts.filter((alert) => alert.priority === "high")

  const getAlertConfig = (alert: Alert) => {
    const baseConfig = {
      missed_dose: {
        icon: AlertTriangle,
        color: isDark ? "text-red-400" : "text-red-600",
        bgColor: isDark ? "bg-red-500/10" : "bg-red-100",
        borderColor: isDark ? "border-l-red-400" : "border-l-red-600",
      },
      medication_reminder: {
        icon: Clock,
        color: isDark ? "text-yellow-400" : "text-yellow-600",
        bgColor: isDark ? "bg-yellow-500/10" : "bg-yellow-100",
        borderColor: isDark ? "border-l-yellow-400" : "border-l-yellow-600",
      },
      adherence_warning: {
        icon: AlertTriangle,
        color: isDark ? "text-red-400" : "text-red-600",
        bgColor: isDark ? "bg-red-500/10" : "bg-red-100",
        borderColor: isDark ? "border-l-red-400" : "border-l-red-600",
      },
      system: {
        icon: Bell,
        color: isDark ? "text-blue-400" : "text-blue-600",
        bgColor: isDark ? "bg-blue-500/10" : "bg-blue-100",
        borderColor: isDark ? "border-l-blue-400" : "border-l-blue-600",
      },
    }
    return baseConfig[alert.type]
  }

  const getPriorityBadge = (priority: Alert["priority"]) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">High</Badge>
      case "medium":
        return <Badge variant="default">Medium</Badge>
      case "low":
        return <Badge variant="secondary">Low</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar title="" showThemeToggle />
        <main className="px-4 py-6 pb-20 space-y-6">
          {/* Loading skeletons */}
          <div className="space-y-4">
            <div className="h-8 bg-muted/20 rounded-lg animate-pulse" />
            <div className="h-4 bg-muted/20 rounded-lg animate-pulse w-2/3" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-20 bg-muted/20 rounded-2xl animate-pulse" />
            <div className="h-20 bg-muted/20 rounded-2xl animate-pulse" />
            <div className="h-20 bg-muted/20 rounded-2xl animate-pulse" />
          </div>
          <div className="space-y-3">
            <div className="h-24 bg-muted/20 rounded-2xl animate-pulse" />
            <div className="h-24 bg-muted/20 rounded-2xl animate-pulse" />
          </div>
        </main>
        <TabBar />
        <VoiceMic />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: durations.md / 1000, ease: easing.enter }}
      className="min-h-screen bg-background"
    >
      <NavBar title="" showThemeToggle>
        <div className="flex items-center space-x-2">
          {activeAlerts.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleAcknowledgeAll} className="btn-premium">
              <Zap className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          )}
          <Button variant="ghost" size="sm" className="btn-premium">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </NavBar>

      <main className="px-4 py-6 pb-20">
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: durations.md / 1000, ease: easing.enter }}
        >
          {/* Header */}
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: durations.sm / 1000, ease: easing.enter }}
          >
            <h1 className="font-heading text-2xl font-bold text-foreground text-balance">Alerts & Notifications</h1>
            <p className="text-muted-foreground text-pretty">
              {activeAlerts.length} active alert{activeAlerts.length !== 1 ? "s" : ""} requiring attention
            </p>
          </motion.div>

          {/* High priority banner */}
          <AnimatePresence>
            {highPriorityAlerts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -20, height: 0 }}
                transition={{ duration: durations.md / 1000, ease: easing.enter }}
                className={cn(!prefersReducedMotion && "animate-pulse")}
              >
                <Card
                  className={cn(
                    "p-4 border-l-4 transition-all duration-300 ease-out",
                    isDark
                      ? "border-l-red-400 bg-gradient-to-r from-red-400/5 to-transparent"
                      : "border-l-red-600 bg-gradient-to-r from-red-600/5 to-transparent",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className={cn("w-5 h-5", isDark ? "text-red-400" : "text-red-600")} />
                      <div>
                        <p className="font-medium text-foreground">
                          {highPriorityAlerts.length} high priority alert{highPriorityAlerts.length !== 1 ? "s" : ""}
                        </p>
                        <p className="text-sm text-muted-foreground">Immediate attention required</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        highPriorityAlerts.forEach((alert) => handleAcknowledge(alert.id))
                      }}
                      className="btn-premium"
                    >
                      Resolve All
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Alert summary cards */}
          <motion.div
            className="grid gap-4 md:grid-cols-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: durations.sm / 1000, ease: easing.enter, delay: 0.1 }}
          >
            <Card className="p-4 glass-card transition-all duration-300 ease-out">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Alerts</p>
                  <p className={cn("text-2xl font-bold font-heading", isDark ? "text-red-400" : "text-red-600")}>
                    {activeAlerts.length}
                  </p>
                </div>
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    isDark ? "bg-red-500/10" : "bg-red-100",
                  )}
                >
                  <AlertTriangle className={cn("w-6 h-6", isDark ? "text-red-400" : "text-red-600")} />
                </div>
              </div>
            </Card>

            <Card className="p-4 glass-card transition-all duration-300 ease-out">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">High Priority</p>
                  <p className={cn("text-2xl font-bold font-heading", isDark ? "text-red-400" : "text-red-600")}>
                    {highPriorityAlerts.length}
                  </p>
                </div>
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    isDark ? "bg-red-500/10" : "bg-red-100",
                  )}
                >
                  <Bell className={cn("w-6 h-6", isDark ? "text-red-400" : "text-red-600")} />
                </div>
              </div>
            </Card>

            <Card className="p-4 glass-card transition-all duration-300 ease-out">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Resolved</p>
                  <p className={cn("text-2xl font-bold font-heading", isDark ? "text-teal-400" : "text-teal-600")}>
                    {alerts.filter((a) => a.status === "acknowledged").length}
                  </p>
                </div>
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    isDark ? "bg-teal-500/10" : "bg-teal-100",
                  )}
                >
                  <CheckCircle className={cn("w-6 h-6", isDark ? "text-teal-400" : "text-teal-600")} />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Filter tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: durations.sm / 1000, ease: easing.enter, delay: 0.2 }}
          >
            <Card className="p-4 transition-all duration-300 ease-out">
              <div className="flex items-center space-x-1">
                {[
                  { key: "all", label: "All", count: alerts.length },
                  { key: "active", label: "Active", count: activeAlerts.length },
                  {
                    key: "acknowledged",
                    label: "Resolved",
                    count: alerts.filter((a) => a.status === "acknowledged").length,
                  },
                ].map((tab) => (
                  <Button
                    key={tab.key}
                    variant={filter === tab.key ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setFilter(tab.key as any)}
                    className="relative btn-premium"
                  >
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                        {tab.count}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Alerts list */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: durations.md / 1000, ease: easing.enter, delay: 0.3 }}
          >
            <AnimatePresence mode="popLayout">
              {filteredAlerts.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: durations.sm / 1000, ease: easing.enter }}
                >
                  <Card className="p-8 text-center transition-all duration-300 ease-out">
                    <div
                      className={cn(
                        "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4",
                        isDark ? "bg-teal-500/10" : "bg-teal-100",
                      )}
                    >
                      <CheckCircle className={cn("w-8 h-8", isDark ? "text-teal-400" : "text-teal-600")} />
                    </div>
                    <h3 className="font-heading text-lg font-semibold text-foreground mb-2">No alerts found</h3>
                    <p className="text-muted-foreground text-pretty">
                      {filter === "active"
                        ? "All alerts have been resolved"
                        : filter === "acknowledged"
                          ? "No resolved alerts yet"
                          : "No alerts to display"}
                    </p>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  className="space-y-3"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: prefersReducedMotion ? 0 : 0.1,
                      },
                    },
                  }}
                >
                  {filteredAlerts.map((alert) => {
                    const config = getAlertConfig(alert)
                    const Icon = config.icon

                    return (
                      <motion.div
                        key={alert.id}
                        variants={{
                          hidden: { opacity: 0, x: 20 },
                          visible: {
                            opacity: 1,
                            x: 0,
                            transition: {
                              duration: durations.sm / 1000,
                              ease: easing.enter,
                            },
                          },
                        }}
                        exit={{
                          opacity: 0,
                          x: -20,
                          transition: {
                            duration: durations.xs / 1000,
                            ease: easing.exit,
                          },
                        }}
                        className={cn(
                          alert.priority === "high" &&
                            alert.status === "active" &&
                            !prefersReducedMotion &&
                            "animate-pulse",
                        )}
                      >
                        <Card
                          className={cn(
                            "p-4 border-l-4 glass-card transition-all duration-300 ease-out",
                            config.borderColor,
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              <div
                                className={cn("w-10 h-10 rounded-xl flex items-center justify-center", config.bgColor)}
                              >
                                <Icon className={cn("w-5 h-5", config.color)} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h3 className="font-medium text-foreground text-balance">{alert.title}</h3>
                                  {getPriorityBadge(alert.priority)}
                                </div>
                                <p className="text-sm text-muted-foreground mb-2 text-pretty">{alert.message}</p>
                                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                  <span>
                                    {new Date(alert.createdAt).toLocaleString([], {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                  {alert.medicationName && <span>• {alert.medicationName}</span>}
                                  {alert.status === "acknowledged" && alert.acknowledgedAt && (
                                    <span>
                                      • Resolved
                                      {" "}
                                      {new Date(alert.acknowledgedAt).toLocaleString([], {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {alert.status === "active" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAcknowledge(alert.id)}
                                className="ml-2 h-8 w-8 p-0 btn-premium"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </Card>
                      </motion.div>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </main>

      <TabBar />
      <VoiceMic />
    </motion.div>
  )
}
