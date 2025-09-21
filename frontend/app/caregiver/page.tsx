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
import { RiskBadgeAuto } from "@/components/risk-badge"
import RiskInsightCard from "../../components/risk-insight-card"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from 'recharts'
import { useMotion } from "@/components/motion-provider"
import { useTheme } from "@/hooks/use-theme"
import { cn } from "@/lib/utils"
import { getUserMe, getDosesToday, type ApiDose, sendInsightsSms } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

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
  adherenceSeries: Array<{ date: string; adherence: number }>
  recentActivity: ActivityItem[]
  lastContact: string
  isOnline: boolean
  patientPhone?: string | null
}

export default function CaregiverPage() {
  const [data, setData] = useState<CaregiverData | null>(null)
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [pwd, setPwd] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [viewMode, setViewMode] = useState<"overview" | "activity">("overview")
  const { prefersReducedMotion, easing, durations } = useMotion()
  const { isDark } = useTheme()
  const { toast } = useToast()

  useEffect(() => {
    // Restore local auth
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem('caregiverAuth') : null
      if (saved === '1') setAuthorized(true)
    } catch {}
  }, [])

  useEffect(() => {
    if (!authorized) return
    const load = async () => {
      try {
        const [user, doses] = await Promise.all([getUserMe(), getDosesToday()])

        const now = new Date()
        const startOfToday = new Date(now)
        startOfToday.setHours(0, 0, 0, 0)
        const endOfToday = new Date(now)
        endOfToday.setHours(23, 59, 59, 999)

        const isToday = (iso: string) => {
          const d = new Date(iso)
          return d >= startOfToday && d <= endOfToday
        }

        // Build recent activity (last 10 items by scheduled_at desc)
        const recentSorted = [...doses].sort(
          (a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime(),
        )
        const recentActivity = recentSorted.slice(0, 10).map<ActivityItem>((d) => {
          const med = d.medication_name || "Medication"
          const common = {
            id: d.id,
            timestamp: d.taken_at || d.scheduled_at,
            medicationName: med,
          }
          if (d.status === "taken") {
            return {
              ...common,
              type: "dose_taken",
              title: "Dose Taken",
              description: `${med} taken`,
              status: "success",
            }
          }
          if (d.status === "snoozed") {
            return {
              ...common,
              type: "dose_snoozed",
              title: "Dose Snoozed",
              description: `${med} snoozed`,
              status: "warning",
            }
          }
          if (d.status === "skipped") {
            return {
              ...common,
              type: "dose_missed",
              title: "Dose Skipped",
              description: `${med} marked as skipped`,
              status: "error",
            }
          }
          // pending
          return {
            ...common,
            type: "alert_triggered",
            title: "Upcoming Dose",
            description: `${med} due at ${new Date(d.scheduled_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}`,
            status: "warning",
          }
        })

        // Today's stats
        const todays = doses.filter((d) => isToday(d.scheduled_at))
        const takenToday = todays.filter((d) => d.status === "taken").length
        const totalToday = todays.length
        const adherenceToday = totalToday > 0 ? Math.round((takenToday / totalToday) * 100) : 0

        // 7-day adherence and trend vs prior 7 days
        const start7 = new Date(now)
        start7.setDate(now.getDate() - 6)
        start7.setHours(0, 0, 0, 0)
        const endPrev7 = new Date(start7)
        endPrev7.setDate(start7.getDate() - 1)
        endPrev7.setHours(23, 59, 59, 999)
        const startPrev7 = new Date(endPrev7)
        startPrev7.setDate(endPrev7.getDate() - 6)
        startPrev7.setHours(0, 0, 0, 0)

        const inRange = (iso: string, start: Date, end: Date) => {
          const d = new Date(iso)
          return d >= start && d <= end
        }

        const last7 = doses.filter((d) => inRange(d.scheduled_at, start7, endOfToday))
        const taken7 = last7.filter((d) => d.status === "taken").length
        const rate7 = last7.length > 0 ? Math.round((taken7 / last7.length) * 100) : adherenceToday

        const prev7 = doses.filter((d) => inRange(d.scheduled_at, startPrev7, endPrev7))
        const prevTaken7 = prev7.filter((d) => d.status === "taken").length
        const prevRate7 = prev7.length > 0 ? Math.round((prevTaken7 / prev7.length) * 100) : rate7
        const weeklyTrend = rate7 - prevRate7

        const riskLevel: Patient["riskLevel"] = rate7 >= 80 ? "Low" : rate7 >= 50 ? "Medium" : "High"
        const lastTaken = recentSorted.find((d) => d.status === "taken")

        // Build 7-day adherence series (each day 0..100, using available doses for that day)
        const series: Array<{ date: string; adherence: number }> = []
        for (let i = 6; i >= 0; i--) {
          const day = new Date(now)
          day.setDate(now.getDate() - i)
          day.setHours(0, 0, 0, 0)
          const dayStart = new Date(day)
          const dayEnd = new Date(day)
          dayEnd.setHours(23, 59, 59, 999)
          const dayDoses = doses.filter((d) => inRange(d.scheduled_at, dayStart, dayEnd))
          const dayTaken = dayDoses.filter((d) => d.status === "taken").length
          const dayRate = dayDoses.length > 0 ? Math.round((dayTaken / dayDoses.length) * 100) : 0
          series.push({ date: day.toISOString().slice(0, 10), adherence: dayRate })
        }

        setData({
          patient: {
            id: user.id,
            name: user.name && user.name.trim().length > 0 ? user.name : "You",
            riskLevel,
            riskScore: rate7,
            avatar: undefined,
          },
          adherenceRate: rate7,
          todaysDoses: { taken: takenToday, total: totalToday },
          weeklyTrend,
          adherenceSeries: series,
          lastContact: lastTaken?.taken_at || lastTaken?.scheduled_at || new Date().toISOString(),
          isOnline: true,
          recentActivity,
          patientPhone: user.phone_enc || null,
        })
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [authorized])

  const handleAuthorize = () => {
    if (pwd === 'Caregiver') {
      setAuthorized(true)
      try { if (typeof window !== 'undefined') window.localStorage.setItem('caregiverAuth', '1') } catch {}
    } else {
      toast({ title: 'Incorrect password', description: 'Please try again.', variant: 'destructive' })
    }
  }
  if (!authorized) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar title="" showThemeToggle />
        <main className="px-4 py-10 pb-20 max-w-md mx-auto">
          <Card className="p-6 glass-card space-y-6">
            <div className="text-center space-y-3">
              <h1 className="font-heading text-xl font-semibold text-foreground">Caregiver Access</h1>
              <p className="text-sm text-muted-foreground">Enter the caregiver password to view this panel.</p>
            </div>
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="Password"
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-yellow-400"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAuthorize() }}
            />
            <div className="flex justify-end">
              <Button onClick={handleAuthorize}>Enter</Button>
            </div>
          </Card>
        </main>
        <TabBar />
      </div>
    )
  }

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
        <NavBar title="" showThemeToggle />
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
        <NavBar title="" showThemeToggle />
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
      <NavBar title="" showThemeToggle>
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
                    src={
                      data.patient.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(data.patient.name || 'Patient')}&background=0D8ABC&color=fff&size=48&format=svg`
                    }
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
                    Last contact: {new Date(data.lastContact).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </Card>

            <RiskInsightCard />
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

                {/* Adherence trend (7d) */}
                <Card className="p-4 glass-card transition-all duration-300 ease-out">
                  <h3 className="font-heading text-lg font-semibold text-foreground mb-3">Adherence Trend</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.adherenceSeries}>
                        <defs>
                          <linearGradient id="adhGradient" x1="0" y1="0" x2="1" y2="0">
                            {data.adherenceSeries.map((p, idx) => {
                              const pct = data.adherenceSeries.length > 1 ? (idx/(data.adherenceSeries.length-1))*100 : 0
                              const hue = Math.max(0, Math.min(120, (p.adherence/100)*120))
                              const color = `hsl(${hue}, 85%, 55%)`
                              return <stop key={idx} offset={`${pct}%`} stopColor={color} />
                            })}
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString(undefined,{month:'short',day:'numeric'})} stroke="currentColor" opacity={0.4} />
                        <YAxis domain={[0,100]} tickCount={6} stroke="currentColor" opacity={0.4} />
                        <Tooltip formatter={(v: number)=>[`${v}%`, 'adherence']} contentStyle={{ background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 8 }} labelFormatter={(v)=>new Date(v).toLocaleDateString()} />
                        <Line
                          type="monotone"
                          dataKey="adherence"
                          connectNulls
                          stroke="url(#adhGradient)"
                          strokeWidth={3}
                          dot={(props: any) => {
                            const { cx, cy, payload, index } = props as { cx: number; cy: number; payload: { adherence: number }; index: number }
                            const hue = Math.max(0, Math.min(120, (payload.adherence/100)*120))
                            const color = `hsl(${hue}, 85%, 55%)`
                            return <circle key={`dot-${index}-${payload?.adherence}`} cx={cx} cy={cy} r={4} fill={color} stroke="#fff" strokeWidth={1} />
                          }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Quick actions */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: durations.md / 1000, ease: easing.enter, delay: 0.4 }}
                >
                  <Card className="p-6 glass-card transition-all duration-300 ease-out">
                    <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                      <a
                        href={data.patientPhone ? `tel:${data.patientPhone}` : undefined}
                        onClick={(e) => { if (!data.patientPhone) { e.preventDefault(); toast({ title: 'Missing phone number', description: 'Add a phone in Settings to call the patient.' }) } }}
                        className="flex items-center space-x-2 justify-start bg-transparent btn-premium border rounded-md px-4 py-2 text-sm"
                        role="button"
                      >
                        <Phone className="w-4 h-4" />
                        <span>Call Patient</span>
                      </a>
                      <Button
                        variant="outline"
                        className="flex items-center space-x-2 justify-start bg-transparent btn-premium"
                        onClick={async () => {
                          try {
                            await sendInsightsSms()
                            toast({ title: 'Message sent', description: 'Insights and reminders sent via SMS.' })
                          } catch (e) {
                            toast({ title: 'Failed to send', description: 'Could not send SMS. Check AWS SNS configuration and phone number.', variant: 'destructive' })
                          }
                        }}
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Send Message</span>
                      </Button>
                      <a
                        href="https://meet.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 justify-start bg-transparent btn-premium border rounded-md px-4 py-2 text-sm"
                        role="button"
                      >
                        <Video className="w-4 h-4" />
                        <span>Video Call</span>
                      </a>
                      <a
                        href="/api/proxy/api/v1/export/adherence.csv"
                        download
                        className="flex items-center space-x-2 justify-start bg-transparent btn-premium border rounded-md px-4 py-2 text-sm"
                        role="button"
                      >
                        <FileText className="w-4 h-4" />
                        <span>View Reports</span>
                      </a>
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
                                  <span>
                                    {new Date(activity.timestamp).toLocaleString([], {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
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
