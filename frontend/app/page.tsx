"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Clock, CheckCircle, Calendar } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { VoiceMic } from "@/components/voice-mic"
import { DoseCard } from "@/components/dose-card"
import { RiskBadge } from "@/components/risk-badge"
import { NavBar } from "@/components/nav-bar"
import { TabBar } from "@/components/tab-bar"
import { useToast } from "@/hooks/use-toast"
import { useMotion } from "@/components/motion-provider"
import { EncouragementCard } from "@/components/encouragement-card"

import { getUserMe, getNextDose, getDosesToday, patchDose, type ApiDose } from "@/lib/api"

export default function Dashboard() {
  const [patientName, setPatientName] = useState<string>("")
  const [doses, setDoses] = useState<ApiDose[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { prefersReducedMotion, easing, durations, stagger } = useMotion()

  useEffect(() => {
    const load = async () => {
      try {
        const me = await getUserMe()
        setPatientName(me.name)
        if (!me.name || me.name === 'Unknown User') {
          window.location.href = '/onboarding'
          return
        }
        const list = await getDosesToday()
        setDoses(list)
      } catch (e: any) {
        if (e?.status === 401) {
          window.location.href = '/login'
          return
        }
        toast({ title: "Please sign in", description: e?.message || "Authentication required" })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Only consider doses scheduled for today based on local calendar date
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const todayKey = `${yyyy}-${mm}-${dd}`

  const localDateKey = (iso: string) => {
    const d = new Date(iso)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const dosesToday = doses
    .filter((d) => localDateKey(d.scheduled_at) === todayKey)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
  const nextDose = dosesToday.find((dose) => dose.status === "pending")
  const todaysTaken = dosesToday.filter((dose) => dose.status === "taken").length
  const todaysTotal = dosesToday.length
  const completionRate = todaysTotal > 0 ? Math.round((todaysTaken / todaysTotal) * 100) : 0

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar title="MedTime" />
        <main className="px-4 py-6 pb-20 space-y-6">
          {/* Loading skeletons */}
          <div className="space-y-4">
            <div className="h-8 bg-muted/20 rounded-lg animate-pulse" />
            <div className="h-4 bg-muted/20 rounded-lg animate-pulse w-2/3" />
          </div>
          <div className="h-32 bg-muted/20 rounded-2xl animate-pulse" />
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

  return (
    <div className="min-h-screen bg-background">
      <NavBar title="MedTime" showThemeToggle />

      <main className="px-4 py-6 pb-20">
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: durations.md / 1000, ease: easing.enter }}
        >
          {/* Header with greeting and stats */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: durations.sm / 1000, ease: easing.enter }}
          >
            <div className="space-y-2">
              <h1 className="font-heading text-2xl font-bold text-foreground text-balance">
                {getGreeting()}, {patientName || ""}
              </h1>
              <p className="text-muted-foreground text-pretty">
                {todaysTaken} of {todaysTotal} doses taken today • {completionRate}% complete
              </p>
            </div>

            {/* Stats cards row */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 transition-all duration-300 ease-out">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-teal-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-heading text-foreground">{todaysTaken}</p>
                    <p className="text-xs text-muted-foreground">Taken Today</p>
                  </div>
                </div>
              </Card>

              <RiskBadge
                score={Number.isFinite(completionRate) ? Math.max(0, Math.min(100, completionRate)) : 0}
                level={
                  Number.isFinite(completionRate)
                    ? completionRate >= 80
                      ? "Low"
                      : completionRate >= 50
                        ? "Medium"
                        : "High"
                    : "Medium"
                }
              />
            </div>
          </motion.div>

          {/* Encouragement card */}
          <EncouragementCard completionRate={completionRate} streak={5} />

          {/* Next dose highlight */}
          <AnimatePresence mode="wait">
            {nextDose ? (
              <motion.div
                key="next-dose"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: durations.md / 1000, ease: easing.enter }}
              >
                <Card className="p-6 border-l-4 border-l-yellow-400 bg-gradient-to-r from-yellow-400/5 to-transparent transition-all duration-300 ease-out">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-medium text-yellow-400">Next Dose</span>
                      </div>
                      <h3 className="font-heading text-lg font-semibold text-foreground">{nextDose.medication_name}</h3>
                      <p className="text-sm text-muted-foreground">Due at {new Date(nextDose.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold font-heading text-yellow-400">{new Date(nextDose.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      <Badge variant="default" className="mt-1">
                        Due Soon
                      </Badge>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="all-done"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: durations.md / 1000, ease: easing.enter }}
              >
                <Card className="p-6 border-l-4 border-l-teal-400 bg-gradient-to-r from-teal-400/5 to-transparent transition-all duration-300 ease-out">
                  <div className="text-center space-y-2">
                    <CheckCircle className="w-8 h-8 text-teal-400 mx-auto" />
                    <h3 className="font-heading text-lg font-semibold text-foreground">{todaysTotal > 0 ? 'All doses complete!' : 'No doses scheduled today'}</h3>
                    <p className="text-muted-foreground">{todaysTotal > 0 ? 'Excellent work staying on track today' : 'Add medications to see your schedule here'}</p>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Today's schedule */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: durations.md / 1000,
              ease: easing.enter,
              delay: 0.2,
            }}
          >
            <div className="flex items-center space-x-2 mb-4">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <h2 className="font-heading text-lg font-semibold text-foreground">Today's Schedule</h2>
              <span className="text-sm text-muted-foreground">{today.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
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
              {dosesToday.map((dose, index) => (
                <motion.div
                  key={dose.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: {
                        duration: durations.sm / 1000,
                        ease: easing.enter,
                      },
                    },
                  }}
                >
                  <DoseCard
                    dose={{
                      id: dose.id,
                      medicationName: dose.medication_name || "",
                      dosage: "",
                      scheduledTime: new Date(dose.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      status: dose.status,
                      takenAt: dose.taken_at || undefined,
                    }}
                    delay={index}
                    onStatusChange={(newStatus) => {
                      if (newStatus === 'pending') return
                      const status = newStatus as 'taken' | 'skipped' | 'snoozed'
                      patchDose(dose.id, {
                        status,
                        taken_at: status === 'taken' ? new Date().toISOString() : undefined,
                      }).then((updated) => {
                        setDoses((prev) => prev.map((d) => (d.id === dose.id ? { ...d, status: updated.status, taken_at: updated.taken_at || null } : d)))
                      })

                      if (newStatus === "taken") {
                        toast({
                          title: "Dose recorded successfully",
                          description: "Great job staying on track!",
                        })
                      } else if (newStatus === "snoozed") {
                        toast({
                          title: "Dose snoozed",
                          description: "We'll remind you again in 15 minutes",
                        })
                      }
                    }}
                  />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      </main>

      <TabBar />
      <VoiceMic />
    </div>
  )
}
