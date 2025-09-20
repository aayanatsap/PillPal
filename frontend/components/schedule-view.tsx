"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DoseCard } from "@/components/dose-card"
import { useMotion } from "@/components/motion-provider"
import { useTheme } from "@/hooks/use-theme"
import { cn } from "@/lib/utils"

interface ScheduleViewProps {
  className?: string
}

interface ScheduledDose {
  id: string
  medicationName: string
  dosage: string
  scheduledTime: string
  status: "pending" | "taken" | "skipped" | "snoozed"
  takenAt?: string
  date: string
}

export function ScheduleView({ className }: ScheduleViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<"day" | "week">("day")
  const { prefersReducedMotion, easing, durations } = useMotion()
  const { isDark } = useTheme()

  // Mock schedule data
  const scheduleData: ScheduledDose[] = [
    {
      id: "1",
      medicationName: "Lisinopril",
      dosage: "10mg",
      scheduledTime: "08:00",
      status: "taken",
      takenAt: "08:05",
      date: "2024-01-15",
    },
    {
      id: "2",
      medicationName: "Metformin",
      dosage: "500mg",
      scheduledTime: "12:00",
      status: "pending",
      date: "2024-01-15",
    },
    {
      id: "3",
      medicationName: "Atorvastatin",
      dosage: "20mg",
      scheduledTime: "20:00",
      status: "pending",
      date: "2024-01-15",
    },
  ]

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

  const todaysDoses = scheduleData.filter((dose) => dose.date === "2024-01-15")
  const completedDoses = todaysDoses.filter((dose) => dose.status === "taken").length
  const totalDoses = todaysDoses.length
  const completionRate = Math.round((completedDoses / totalDoses) * 100)

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
              <span className="text-sm font-medium text-foreground">Today's Progress</span>
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
            {todaysDoses.map((dose, index) => (
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
                  dose={dose}
                  delay={index}
                  onStatusChange={(newStatus) => {
                    // Handle status change
                    console.log(`Dose ${dose.id} status changed to ${newStatus}`)
                  }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  )
}
