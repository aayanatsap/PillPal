"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar, Clock, Activity, Phone, MessageCircle, FileText, TrendingUp, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { NavBar } from "@/components/nav-bar"
import { TabBar } from "@/components/tab-bar"
import { VoiceMic } from "@/components/voice-mic"
import { RiskBadge } from "@/components/risk-badge"
import { useMotion } from "@/components/motion-provider"
import { useTheme } from "@/hooks/use-theme"
import { cn } from "@/lib/utils"

interface Patient {
  id: string
  name: string
  riskLevel: "Low" | "Medium" | "High"
  riskScore: number
  avatar?: string
}

interface ActivityItem {
  id: string
  type: "dose_taken" | "dose_missed" | "dose_snoozed" | "alert_triggered"
  title: string
  description: string
  timestamp: string
  medicationName?: string
  status: "success" | "warning" | "error"
}

interface CaregiverData {
  patient: Patient
  adherenceRate: number
  todaysDoses: { taken: number; total: number }
  weeklyTrend: number
  recentActivity: ActivityItem[]
  lastContact: string
  isOnline: boolean
}

export default function CaregiverPage() {
  const [data, setData] = useState<CaregiverData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [viewMode, setViewMode] = useState<"overview" | "activity">("overview")
  const { prefersReducedMotion, easing, durations } = useMotion()
  const { isDark } = useTheme()

  useEffect(() => {
    // Mock data loading
    setTimeout(() => {
      setData({
        patient: {
          id: "1",
          name: "",
          riskLevel: "Low",
          riskScore: 85,
          avatar: "/elderly-woman-smiling.png",
        },
        adherenceRate: 92,
        todaysDoses: { taken: 2, total: 3 },
        weeklyTrend: 5,
        lastContact: "2024-01-14T10:30:00Z",
        isOnline: true,
        recentActivity: [
          {
            id: "1",
            type: "dose_taken",
            title: "Dose Taken",
            description: "Lisinopril 10mg taken on time",
            timestamp: "2024-01-15T08:05:00Z",
            medicationName: "Lisinopril",
            status: "success",
          },
          {
            id: "2",
            type: "dose_missed",
            title: "Missed Dose",
            description: "Metformin 500mg - 30 minutes overdue",
            timestamp: "2024-01-15T12:30:00Z",
            medicationName: "Metformin",
            status: "error",
          },
          {
            id: "3",
            type: "dose_snoozed",
            title: "Dose Snoozed",
            description: "Atorvastatin 20mg snoozed for 15 minutes",
            timestamp: "2024-01-14T20:15:00Z",
            medicationName: "Atorvastatin",
            status: "warning",
          },
          {
            id: "4",
            type: "alert_triggered",
            title: "Adherence Alert",
            description: "Weekly adherence dropped below 90%",
            timestamp: "2024-01-14T09:00:00Z",
            status: "warning",
          },
        ],
      })
      setLoading(false)
    }, 800)
  }, [])

  const getActivityConfig = (activity: ActivityItem) => {
    const baseConfig = {
      dose_taken: {
        icon: Clock,
        color: isDark ? "text-teal-400" : "text-teal-600",
        bgColor: isDark ? "bg-teal-500/10" : "bg-teal-100",
      },
      dose_missed: {
        icon: Clock,
        color: isDark ? "text-red-400" : "text-red-600",
        bgColor: isDark ? "bg-red-500/10" : "bg-red-100",
      },
      dose_snoozed: {
        icon: Clock,
        color: isDark ? "text-yellow-400" : "text-yellow-600",
        bgColor: isDark ? "bg-yellow-500/10" : "bg-yellow-100",
      },
      alert_triggered: {
        icon: Activity,
        color: isDark ? "text-orange-400" : "text-orange-600",
        bgColor: isDark ? "bg-orange-500/10" : "bg-orange-100",
      },
    }
    return baseConfig[activity.type]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar title="Caregiver" showThemeToggle />
        <main className="px-4 py-6 pb-20 space-y-6">
          {/* Loading skeletons */}
          <div className="space-y-4">
            <div className="h-8 bg-muted/20 rounded-lg animate-pulse" />
            <div className="h-4 bg-muted/20 rounded-lg animate-pulse w-2/3" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-24 bg-muted/20 rounded-2xl animate-pulse" />
            <div className="h-24 bg-muted/20 rounded-2xl animate-pulse" />
            <div className="h-24 bg-muted/20 rounded-2xl animate-pulse" />
          </div>
          <div className="space-y-3">
            <div className="h-20 bg-muted/20 rounded-2xl animate-pulse" />
            <div className="h-20 bg-muted/20 rounded-2xl animate-pulse" />
          </div>
        </main>
        <TabBar />
        <VoiceMic />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar title="Caregiver" showThemeToggle />
        <main className="px-4 py-6 pb-20">
          <Card className="p-8 text-center transition-all duration-300 ease-out">
            <p className="text-muted-foreground">Failed to load caregiver data</p>
          </Card>
        </main>
        <TabBar />
        <VoiceMic />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar title="Caregiver" showThemeToggle>
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-muted/20 rounded-lg p-1">
            <Button
              variant={viewMode === "overview" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("overview")}
              className="text-xs h-7"
            >
              Overview
            </Button>
            <Button
              variant={viewMode === "activity" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("activity")}
              className="text-xs h-7"
            >
              Activity
            </Button>
          </div>
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-2 py-1 bg-transparent border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-all duration-300 ease-out"
          />
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
            <h1 className="font-heading text-2xl font-bold text-foreground text-balance">Caregiver Dashboard</h1>
            <p className="text-muted-foreground text-pretty">
              Monitoring {data.patient.name}'s medication adherence and health status
            </p>
          </motion.div>

          {/* Patient overview */}
          <motion.div
            className="grid gap-4 md:grid-cols-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: durations.sm / 1000, ease: easing.enter, delay: 0.1 }}
          >
            <Card className="p-4 glass-card transition-all duration-300 ease-out">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-foreground">Patient Overview</h3>
                <div className="flex items-center space-x-2">
                  <div className={cn("w-2 h-2 rounded-full", data.isOnline ? "bg-teal-400" : "bg-muted-foreground")} />
                  <span className="text-xs text-muted-foreground">{data.isOnline ? "Online" : "Offline"}</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img
                    src={data.patient.avatar || "/placeholder.svg?height=48&width=48&query=patient avatar"}
                    alt={data.patient.name}
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                  {data.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-teal-400 rounded-full border-2 border-background" />
                  )}
                </div>
                <div>
                  <p className="font-heading text-lg font-semibold text-foreground">{data.patient.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Last contact: {new Date(data.lastContact).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Card>

            <RiskBadge score={data.patient.riskScore} level={data.patient.riskLevel} />
          </motion.div>

          <AnimatePresence mode="wait">
            {viewMode === "overview" ? (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: durations.sm / 1000, ease: easing.enter }}
                className="space-y-6"
              >
                {/* Stats cards */}
                <motion.div
                  className="grid gap-4 md:grid-cols-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: durations.sm / 1000, ease: easing.enter, delay: 0.2 }}
                >
                  <Card className="p-4 glass-card transition-all duration-300 ease-out">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Adherence Rate</p>
                        <div className="flex items-center space-x-2">
                          <p
                            className={cn(
                              "text-2xl font-bold font-heading",
                              isDark ? "text-teal-400" : "text-teal-600",
                            )}
                          >
                            {data.adherenceRate}%
                          </p>
                          <Badge variant={data.weeklyTrend > 0 ? "success" : "destructive"} className="text-xs">
                            {data.weeklyTrend > 0 ? "+" : ""}
                            {data.weeklyTrend}%
                          </Badge>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center",
                          isDark ? "bg-teal-500/10" : "bg-teal-100",
                        )}
                      >
                        <TrendingUp className={cn("w-6 h-6", isDark ? "text-teal-400" : "text-teal-600")} />
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 glass-card transition-all duration-300 ease-out">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Today's Doses</p>
                        <p className="text-2xl font-bold font-heading text-foreground">
                          {data.todaysDoses.taken}/{data.todaysDoses.total}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center",
                          isDark ? "bg-blue-500/10" : "bg-blue-100",
                        )}
                      >
                        <Clock className={cn("w-6 h-6", isDark ? "text-blue-400" : "text-blue-600")} />
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 glass-card transition-all duration-300 ease-out">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Recent Alerts</p>
                        <p
                          className={cn(
                            "text-2xl font-bold font-heading",
                            isDark ? "text-yellow-400" : "text-yellow-600",
                          )}
                        >
                          {data.recentActivity.filter((a) => a.status === "error" || a.status === "warning").length}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center",
                          isDark ? "bg-yellow-500/10" : "bg-yellow-100",
                        )}
                      >
                        <Activity className={cn("w-6 h-6", isDark ? "text-yellow-400" : "text-yellow-600")} />
                      </div>
                    </div>
                  </Card>
                </motion.div>

                {/* Quick actions */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: durations.md / 1000, ease: easing.enter, delay: 0.4 }}
                >
                  <Card className="p-6 glass-card transition-all duration-300 ease-out">
                    <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                      <Button
                        variant="outline"
                        className="flex items-center space-x-2 justify-start bg-transparent btn-premium"
                      >
                        <Phone className="w-4 h-4" />
                        <span>Call Patient</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="flex items-center space-x-2 justify-start bg-transparent btn-premium"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Send Message</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="flex items-center space-x-2 justify-start bg-transparent btn-premium"
                      >
                        <Video className="w-4 h-4" />
                        <span>Video Call</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="flex items-center space-x-2 justify-start bg-transparent btn-premium"
                      >
                        <FileText className="w-4 h-4" />
                        <span>View Reports</span>
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="activity"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: durations.sm / 1000, ease: easing.enter }}
              >
                {/* Recent activity */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: durations.md / 1000, ease: easing.enter, delay: 0.3 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-heading text-lg font-semibold text-foreground">Recent Activity</h2>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedDate).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>

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
                    {data.recentActivity.map((activity) => {
                      const config = getActivityConfig(activity)
                      const Icon = config.icon

                      return (
                        <motion.div
                          key={activity.id}
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
                        >
                          <Card className="p-4 glass-card transition-all duration-300 ease-out">
                            <div className="flex items-start space-x-3">
                              <div
                                className={cn("w-10 h-10 rounded-xl flex items-center justify-center", config.bgColor)}
                              >
                                <Icon className={cn("w-5 h-5", config.color)} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h3 className="font-medium text-foreground">{activity.title}</h3>
                                  <Badge
                                    variant={
                                      activity.status === "success"
                                        ? "success"
                                        : activity.status === "error"
                                          ? "destructive"
                                          : "default"
                                    }
                                    className="text-xs"
                                  >
                                    {activity.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2 text-pretty">{activity.description}</p>
                                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                  <span>{new Date(activity.timestamp).toLocaleTimeString()}</span>
                                  {activity.medicationName && <span>• {activity.medicationName}</span>}
                                </div>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      )
                    })}
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      <TabBar />
      <VoiceMic />
    </div>
  )
}
