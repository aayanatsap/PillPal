"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, Clock, X, Pause, Pill } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useMotion } from "@/components/motion-provider"
import { useTheme } from "@/hooks/use-theme"
import { cn } from "@/lib/utils"

interface Dose {
  id: string
  medicationName: string
  dosage: string
  scheduledTime: string
  status: "pending" | "taken" | "skipped" | "snoozed"
  takenAt?: string
}

interface DoseCardProps {
  dose: Dose
  delay?: number
  onStatusChange: (status: Dose["status"]) => void
}

export function DoseCard({ dose, delay = 0, onStatusChange }: DoseCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const { prefersReducedMotion, easing, durations } = useMotion()
  const { isDark } = useTheme()

  const handleStatusChange = async (newStatus: Dose["status"]) => {
    setIsUpdating(true)
    setShowActions(false)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500))
      onStatusChange(newStatus)
    } catch (error) {
      console.error("Failed to update dose status:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusConfig = () => {
    switch (dose.status) {
      case "taken":
        return {
          color: isDark ? "text-teal-400" : "text-teal-600",
          bgColor: isDark ? "bg-teal-500/10" : "bg-teal-100",
          icon: Check,
          badge: "success" as const,
          cardBorder: isDark ? "border-teal-500/20" : "border-teal-200",
        }
      case "skipped":
        return {
          color: isDark ? "text-red-400" : "text-red-600",
          bgColor: isDark ? "bg-red-500/10" : "bg-red-100",
          icon: X,
          badge: "destructive" as const,
          cardBorder: isDark ? "border-red-500/20" : "border-red-200",
        }
      case "snoozed":
        return {
          color: isDark ? "text-yellow-400" : "text-yellow-600",
          bgColor: isDark ? "bg-yellow-500/10" : "bg-yellow-100",
          icon: Pause,
          badge: "default" as const,
          cardBorder: isDark ? "border-yellow-500/20" : "border-yellow-200",
        }
      default:
        return {
          color: "text-muted-foreground",
          bgColor: "bg-muted/20",
          icon: Clock,
          badge: "outline" as const,
          cardBorder: "border-border",
        }
    }
  }

  const statusConfig = getStatusConfig()
  const StatusIcon = statusConfig.icon

  const isDueSoon =
    dose.status === "pending" &&
    (() => {
      const now = new Date()
      const [hours, minutes] = dose.scheduledTime.split(":").map(Number)
      const scheduledTime = new Date()
      scheduledTime.setHours(hours, minutes, 0, 0)
      const timeDiff = scheduledTime.getTime() - now.getTime()
      return timeDiff <= 30 * 60 * 1000 && timeDiff > 0 // Within 30 minutes
    })()

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{
        duration: durations.sm / 1000,
        ease: easing.enter,
        delay: delay * 0.1,
      }}
      className={cn(
        "motion-safe:transition-all motion-safe:duration-300",
        dose.status === "taken" && "animate-[successWash_0.6s_ease-out]",
        dose.status === "skipped" && "animate-[skipWash_0.6s_ease-out]",
      )}
    >
      <Card
        className={cn(
          "p-4 border-2 transition-all duration-300 ease-out",
          statusConfig.cardBorder,
          isDueSoon && !prefersReducedMotion && "animate-[breathGlow_2s_ease-in-out_infinite]",
          isDueSoon && "shadow-lg",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <motion.div
              className={cn("w-12 h-12 rounded-xl flex items-center justify-center relative", statusConfig.bgColor)}
              animate={
                dose.status === "taken" && !prefersReducedMotion
                  ? {
                      scale: [1, 1.1, 1],
                    }
                  : {}
              }
              transition={{ duration: 0.6 }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={dose.status}
                  initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
                  transition={{
                    duration: prefersReducedMotion ? 0 : durations.xs / 1000,
                    ease: easing.enter,
                  }}
                >
                  <StatusIcon className={cn("w-6 h-6", statusConfig.color)} />
                </motion.div>
              </AnimatePresence>

              {dose.status === "pending" && (
                <Pill className="w-3 h-3 text-muted-foreground absolute -bottom-1 -right-1" />
              )}
            </motion.div>

            <div className="space-y-1">
              <h3 className="font-heading font-semibold text-foreground text-balance">{dose.medicationName}</h3>
              <p className="text-sm text-muted-foreground">
                {dose.scheduledTime} • {dose.dosage}
              </p>
              {isDueSoon && (
                <motion.p
                  className="text-xs font-medium text-yellow-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Due soon
                </motion.p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant={statusConfig.badge} className="capitalize font-medium">
              {dose.status}
            </Badge>

            {/* Desktop/tablet: inline actions */}
            {dose.status === "pending" && (
              <div className="hidden sm:flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStatusChange("snoozed")}
                  disabled={isUpdating}
                  className="btn-premium"
                >
                  <Pause className="w-4 h-4 mr-1" />
                  Snooze
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleStatusChange("skipped")}
                  disabled={isUpdating}
                  className="btn-premium"
                >
                  <X className="w-4 h-4 mr-1" />
                  Skip
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleStatusChange("taken")}
                  disabled={isUpdating}
                  className="btn-premium bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Take
                </Button>
              </div>
            )}

            {/* Mobile: prominent Actions toggle */}
            {dose.status === "pending" && (
              <motion.div
                className="sm:hidden flex items-center"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: durations.sm / 1000,
                  ease: easing.enter,
                }}
              >
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowActions(!showActions)}
                  disabled={isUpdating}
                  className={cn("h-8 px-3 btn-premium ring-2 ring-yellow-300/50", !prefersReducedMotion && "animate-pulse")}
                >
                  Actions
                </Button>
              </motion.div>
            )}
          </div>
        </div>

        {dose.status !== "pending" && dose.takenAt && (
          <motion.div
            className="mt-3 text-xs text-muted-foreground"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: durations.sm / 1000 }}
          >
            {dose.status === "taken" && `Taken at ${dose.takenAt}`}
          </motion.div>
        )}

        {/* Mobile expanded actions */}
        <AnimatePresence>
          {showActions && dose.status === "pending" && (
            <motion.div
              className="md:hidden mt-4 pt-4 border-t border-border/50"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{
                duration: durations.sm / 1000,
                ease: easing.enter,
              }}
            >
              <div className="flex items-center justify-end space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStatusChange("snoozed")}
                  disabled={isUpdating}
                  className="btn-premium"
                >
                  <Pause className="w-4 h-4 mr-1" />
                  Snooze
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleStatusChange("skipped")}
                  disabled={isUpdating}
                  className="btn-premium"
                >
                  <X className="w-4 h-4 mr-1" />
                  Skip
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleStatusChange("taken")}
                  disabled={isUpdating}
                  className="btn-premium bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Take
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}
