"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { useMotion } from "@/components/motion-provider"

export interface MotionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  delay?: number
}

const MotionCard = React.forwardRef<HTMLDivElement, MotionCardProps>(
  ({ className, delay = 0, children, ...props }, ref) => {
    const { prefersReducedMotion, easing, durations } = useMotion()

    const motionProps = prefersReducedMotion
      ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
      : {
          initial: { opacity: 0, y: 6 },
          animate: {
            opacity: 1,
            y: 0,
            transition: {
              duration: durations.sm / 1000,
              ease: easing.easeOutCalm,
              delay: delay / 1000,
            },
          },
        }

    return (
      <motion.div className={cn("card", className)} ref={ref} {...motionProps} {...props}>
        {children}
      </motion.div>
    )
  },
)
MotionCard.displayName = "MotionCard"

export { MotionCard }
