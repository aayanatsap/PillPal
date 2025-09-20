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
    // Mock data loading
    setTimeout(() => {
      setAlerts([
        {
          id: "1",
          type: "missed_dose",
          title: "Missed Dose Alert",
          message: "You missed your 12:00 PM Metformin dose",
          priority: "high",
          status: "active",
          createdAt: "2024-01-15T12:30:00Z",
          medicationName: "Metformin",
        },
        {
          id: "2",
          type: "medication_reminder",
          title: "Upcoming Dose",
          message: "Atorvastatin 20mg due in 30 minutes",
          priority: "medium",
          status: "active",
          createdAt: "2024-01-15T19:30:00Z",
          medicationName: "Atorvastatin",
        },
        {
          id: "3",
          type: "adherence_warning",
          title: "Adherence Concern",
          message: "You've missed 3 doses this week. Consider setting more reminders.",
          priority: "high",
          status: "acknowledged",
          createdAt: "2024-01-14T10:00:00Z",
          acknowledgedAt: "2024-01-14T14:30:00Z",
        },
        {
          id: "4",
          type: "system",
          title: "Profile Updated",
          message: "Your medication schedule has been updated successfully",
          priority: "low",
          status: "acknowledged",
          createdAt: "2024-01-13T16:00:00Z",
          acknowledgedAt: "2024-01-13T16:05:00Z",
        },
      ])
      setLoading(false)
    }, 800)
  }, [])

  const handleAcknowledge = (alertId: string) => {
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

  const handleAcknowledgeAll = () => {
    const activeAlerts = alerts.filter((alert) => alert.status === "active")
    if (activeAlerts.length === 0) return

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
        <NavBar title="Alerts" showThemeToggle />
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
    <div className="min-h-screen bg-background">
      <NavBar title="Alerts" showThemeToggle>
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
                                  <span>{new Date(alert.createdAt).toLocaleString()}</span>
                                  {alert.medicationName && <span>• {alert.medicationName}</span>}
                                  {alert.status === "acknowledged" && alert.acknowledgedAt && (
                                    <span>• Resolved {new Date(alert.acknowledgedAt).toLocaleString()}</span>
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
    </div>
  )
}
