"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DoseCard } from "@/components/dose-card"
import { useMotion } from "@/components/motion-provider"
import { useTheme } from "@/hooks/use-theme"
import { useToast } from "@/hooks/use-toast"
import { getDosesToday, patchDose, type ApiDose } from "@/lib/api"
import { cn } from "@/lib/utils"

interface ScheduleViewProps {
  className?: string
}

function toLocalDateKey(isoStr: string): string {
  const d = new Date(isoStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function selectedDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function ScheduleView({ className }: ScheduleViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<"day" | "week">("day")
  const [doses, setDoses] = useState<ApiDose[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { prefersReducedMotion, easing, durations } = useMotion()
  const { isDark } = useTheme()
  const { toast } = useToast()

  const loadDoses = useCallback(async () => {
    try {
      const data = await getDosesToday()
      setDoses(data || [])
    } catch {
      setDoses([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDoses()
  }, [loadDoses])

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate)
    if (viewMode === "day") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1))
    } else {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7))
    }
    setSelectedDate(newDate)
  }

  const targetKey = selectedDateKey(selectedDate)

  const getWeekKeys = () => {
    const keys = new Set<string>()
    for (let i = 0; i < 7; i++) {
      const d = new Date(selectedDate)
      d.setDate(selectedDate.getDate() - selectedDate.getDay() + i)
      keys.add(selectedDateKey(d))
    }
    return keys
  }

  const displayedDoses = doses.filter((d) => {
    const key = toLocalDateKey(d.scheduled_at)
    return viewMode === "day" ? key === targetKey : getWeekKeys().has(key)
  })

  const completedDoses = displayedDoses.filter((d) => d.status === "taken").length
  const totalDoses = displayedDoses.length
  const completionRate = totalDoses > 0 ? Math.round((completedDoses / totalDoses) * 100) : 0

  const handleStatusChange = async (dose: ApiDose, newStatus: "pending" | "taken" | "skipped" | "snoozed") => {
    const body: Parameters<typeof patchDose>[1] = { status: newStatus as "taken" | "skipped" | "snoozed" }
    if (newStatus === "taken") body.taken_at = new Date().toISOString()
    try {
      const updated = await patchDose(dose.id, body)
      setDoses((prev) => prev.map((d) => (d.id === dose.id ? { ...d, ...updated } : d)))
    } catch (error: any) {
      toast({
        title: "Failed to update dose",
        description: error?.message || "Please try again.",
        variant: "destructive",
      })
    }
  }

  const toDoseCardFormat = (d: ApiDose) => ({
    id: d.id,
    medicationName: d.medication_name || "Unknown",
    dosage: "",
    scheduledTime: new Date(d.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
    status: d.status,
    takenAt: d.taken_at || undefined,
  })

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with date navigation */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: durations.sm / 1000, ease: easing.enter }}
      >
        <div className="space-y-1">
          <h2 className="font-heading text-xl font-semibold text-foreground">Schedule</h2>
          <p className="text-sm text-muted-foreground">{formatDate(selectedDate)}</p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-muted/20 rounded-lg p-1">
            <Button
              variant={viewMode === "day" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("day")}
              className="text-xs h-7"
            >
              Day
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("week")}
              className="text-xs h-7"
            >
              Week
            </Button>
          </div>

          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm" onClick={() => navigateDate("prev")} className="h-8 w-8 p-0">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigateDate("next")} className="h-8 w-8 p-0">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Progress overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: durations.sm / 1000, ease: easing.enter, delay: 0.1 }}
      >
        <Card className="p-4 transition-all duration-300 ease-out">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {viewMode === "day" ? "Day's Progress" : "Week's Progress"}
              </span>
            </div>
            <Badge variant={completionRate === 100 ? "success" : completionRate >= 50 ? "default" : "destructive"}>
              {completionRate}%
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {completedDoses} of {totalDoses} doses taken
              </span>
              <span className="text-foreground font-medium">{completionRate}% complete</span>
            </div>
            <div className="w-full bg-muted/20 rounded-full h-2">
              <motion.div
                className={cn(
                  "h-2 rounded-full",
                  completionRate === 100
                    ? "bg-teal-500"
                    : completionRate >= 50
                      ? isDark
                        ? "bg-yellow-400"
                        : "bg-blue-600"
                      : "bg-red-500",
                )}
                initial={{ width: 0 }}
                animate={{ width: `${completionRate}%` }}
                transition={{ duration: 1, ease: easing.enter, delay: 0.3 }}
              />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Schedule timeline */}
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: durations.md / 1000, ease: easing.enter, delay: 0.2 }}
      >
        <div className="flex items-center space-x-2 mb-4">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-heading text-lg font-semibold text-foreground">
            {viewMode === "day" ? "Today's Doses" : "This Week"}
          </h3>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading schedule...</p>
        ) : displayedDoses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No doses scheduled for this period.</p>
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
            <AnimatePresence mode="wait">
              {displayedDoses.map((dose, index) => (
                <motion.div
                  key={dose.id}
                  variants={{
                    hidden: { opacity: 0, x: -20 },
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
                  <DoseCard
                    dose={toDoseCardFormat(dose)}
                    delay={index}
                    onStatusChange={(newStatus) => handleStatusChange(dose, newStatus)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
