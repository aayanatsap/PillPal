"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { AlertTriangle, Clock, User, Check, X } from "lucide-react"
import { MotionCard } from "@/components/ui/motion-card"
import { MotionButton } from "@/components/ui/motion-button"
import { useMotion } from "@/components/motion-provider"
import type { Alert } from "@/lib/alerts-api"

interface AlertItemProps {
  alert: Alert
  delay?: number
  onAcknowledge: () => void
}

export function AlertItem({ alert, delay = 0, onAcknowledge }: AlertItemProps) {
  const [isAcknowledging, setIsAcknowledging] = useState(false)
  const { prefersReducedMotion, easing, durations } = useMotion()

  const handleAcknowledge = async () => {
    setIsAcknowledging(true)
    await new Promise((resolve) => setTimeout(resolve, 300))
    onAcknowledge()
  }

  const getAlertIcon = () => {
    switch (alert.type) {
      case "missed_dose":
        return Clock
      case "late_dose":
        return AlertTriangle
      case "risk_increase":
        return AlertTriangle
      case "caregiver_notification":
        return User
      default:
        return AlertTriangle
    }
  }

  const getAlertColor = () => {
    switch (alert.priority) {
      case "high":
        return "rgb(239 68 68)" // red-500
      case "medium":
        return "rgb(20 184 166)" // teal-500
      case "low":
        return "rgb(34 197 94)" // green-500
      default:
        return "rgb(115 115 115)" // neutral-500
    }
  }

  const getPriorityLabel = () => {
    switch (alert.priority) {
      case "high":
        return "High Priority"
      case "medium":
        return "Medium Priority"
      case "low":
        return "Low Priority"
      default:
        return "Normal"
    }
  }

  const Icon = getAlertIcon()
  const color = getAlertColor()

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 20 }}
      animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
      exit={
        prefersReducedMotion
          ? { opacity: 0 }
          : {
              opacity: 0,
              x: -20,
              scale: 0.95,
              transition: { duration: durations.sm / 1000 },
            }
      }
      transition={{
        duration: durations.sm / 1000,
        ease: easing.easeOutCalm,
        delay: delay / 1000,
      }}
      layout
    >
      <MotionCard
        className={`p-4 bg-white border-l-4 transition-all duration-240 ${
          alert.status === "acknowledged" ? "opacity-60" : ""
        }`}
        style={{
          borderLeftColor: color,
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${color}15` }}
            >
              <Icon className="w-5 h-5" style={{ color }} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-medium text-neutral-700">{alert.title}</h3>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${color}15`,
                    color: color,
                  }}
                >
                  {getPriorityLabel()}
                </span>
              </div>

              <p className="text-neutral-500 mb-2">{alert.message}</p>

              <div className="flex items-center space-x-4 text-sm text-neutral-400">
                <span>{new Date(alert.createdAt).toLocaleString()}</span>
                {alert.patientName && <span>Patient: {alert.patientName}</span>}
                {alert.status === "acknowledged" && alert.acknowledgedAt && (
                  <span className="text-green-600">Acknowledged {new Date(alert.acknowledgedAt).toLocaleString()}</span>
                )}
              </div>
            </div>
          </div>

          {alert.status === "active" && (
            <motion.div
              className="flex items-center space-x-2 ml-4"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: (delay + 200) / 1000 }}
            >
              <MotionButton
                variant="ghost"
                size="sm"
                onClick={handleAcknowledge}
                disabled={isAcknowledging}
                className="text-green-600 hover:bg-green-50"
              >
                {isAcknowledging ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  >
                    <Clock className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <Check className="w-4 h-4" />
                )}
              </MotionButton>
              <MotionButton variant="ghost" size="sm" className="text-neutral-500">
                <X className="w-4 h-4" />
              </MotionButton>
            </motion.div>
          )}
        </div>
      </MotionCard>
    </motion.div>
  )
}
