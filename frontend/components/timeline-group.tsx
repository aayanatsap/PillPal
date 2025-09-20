"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronRight, Clock, Check, X, AlertTriangle } from "lucide-react"
import { MotionCard } from "@/components/ui/motion-card"
import { ActivityBadge } from "@/components/activity-badge"
import { useMotion } from "@/components/motion-provider"
import type { TimelineGroup as TimelineGroupType } from "@/lib/caregiver-api"

interface TimelineGroupProps {
  group: TimelineGroupType
  delay?: number
  onNewActivity: (hasNew: boolean) => void
}

export function TimelineGroup({ group, delay = 0, onNewActivity }: TimelineGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { prefersReducedMotion, easing, durations } = useMotion()

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "dose_taken":
        return Check
      case "dose_missed":
        return X
      case "dose_snoozed":
        return Clock
      case "alert_created":
        return AlertTriangle
      default:
        return Clock
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case "dose_taken":
        return "rgb(34 197 94)" // green-500
      case "dose_missed":
        return "rgb(239 68 68)" // red-500
      case "dose_snoozed":
        return "rgb(20 184 166)" // teal-500
      case "alert_created":
        return "rgb(239 68 68)" // red-500
      default:
        return "rgb(115 115 115)" // neutral-500
    }
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
    if (!isExpanded && group.hasNewActivities) {
      onNewActivity(false)
    }
  }

  return (
    <MotionCard delay={delay} className="bg-white overflow-hidden">
      <motion.button
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        onClick={toggleExpanded}
        whileTap={prefersReducedMotion ? {} : { scale: 0.995 }}
      >
        <div className="flex items-center space-x-3">
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : durations.xs / 1000 }}
          >
            <ChevronRight className="w-5 h-5 text-neutral-500" />
          </motion.div>
          <div className="text-left">
            <h3 className="font-medium text-neutral-700">{group.title}</h3>
            <p className="text-sm text-neutral-500">{group.activities.length} activities</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {group.hasNewActivities && <ActivityBadge count={group.newActivityCount} />}
          <span className="text-sm text-neutral-500">{group.timeRange}</span>
        </div>
      </motion.button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, height: "auto" }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{
              duration: durations.sm / 1000,
              ease: easing.easeOutCalm,
            }}
            className="border-t border-gray-100"
          >
            <div className="p-4 space-y-3">
              {group.activities.map((activity, index) => {
                const Icon = getActivityIcon(activity.type)
                const color = getActivityColor(activity.type)

                return (
                  <motion.div
                    key={activity.id}
                    className="flex items-start space-x-3"
                    initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -20 }}
                    animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                    transition={{
                      duration: durations.xs / 1000,
                      delay: (index * 50) / 1000,
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                      style={{ backgroundColor: `${color}15` }}
                    >
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-neutral-700">{activity.description}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-neutral-400">{activity.time}</span>
                        {activity.isNew && (
                          <motion.span
                            className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            New
                          </motion.span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionCard>
  )
}
