"use client"

import { motion } from "framer-motion"
import { AlertTriangle, ArrowRight } from "lucide-react"
import { MotionButton } from "@/components/ui/motion-button"
import { useMotion } from "@/components/motion-provider"

interface EscalationBannerProps {
  alertCount: number
}

export function EscalationBanner({ alertCount }: EscalationBannerProps) {
  const { prefersReducedMotion, easing, durations } = useMotion()

  return (
    <motion.div
      className="bg-gradient-to-r from-[var(--color-alert)]/10 to-[var(--color-alert)]/5 border border-[var(--color-alert)]/20 rounded-lg p-4"
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.95 }}
      animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.95 }}
      transition={{
        duration: durations.sm / 1000,
        ease: easing.easeOutCalm,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <motion.div
            className="w-10 h-10 bg-[var(--color-alert)]/15 rounded-full flex items-center justify-center"
            animate={
              prefersReducedMotion
                ? {}
                : {
                    scale: [1, 1.05, 1],
                    backgroundColor: ["rgba(217, 83, 79, 0.15)", "rgba(217, 83, 79, 0.25)", "rgba(217, 83, 79, 0.15)"],
                  }
            }
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          >
            <AlertTriangle className="w-5 h-5 text-[var(--color-alert)]" />
          </motion.div>

          <div>
            <h3 className="font-semibold text-[var(--color-alert)]">High Priority Alerts Require Attention</h3>
            <p className="text-[var(--color-text)]/70">
              {alertCount} high priority alert{alertCount !== 1 ? "s" : ""} need{alertCount === 1 ? "s" : ""} immediate
              escalation to caregivers and clinicians
            </p>
          </div>
        </div>

        <MotionButton
          variant="ghost"
          className="text-[var(--color-alert)] hover:bg-[var(--color-alert)]/10 flex items-center space-x-2"
        >
          <span>Escalate Now</span>
          <motion.div
            animate={prefersReducedMotion ? {} : { x: [0, 4, 0] }}
            transition={{
              duration: 1.5,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          >
            <ArrowRight className="w-4 h-4" />
          </motion.div>
        </MotionButton>
      </div>
    </motion.div>
  )
}
