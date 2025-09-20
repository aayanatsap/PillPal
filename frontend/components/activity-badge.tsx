"use client"

import { motion } from "framer-motion"
import { useMotion } from "@/components/motion-provider"

interface ActivityBadgeProps {
  count: number
}

export function ActivityBadge({ count }: ActivityBadgeProps) {
  const { prefersReducedMotion } = useMotion()

  if (count === 0) return null

  return (
    <motion.div
      className="w-5 h-5 bg-[var(--color-alert)] text-white text-xs font-medium rounded-full flex items-center justify-center"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : {
              type: "spring",
              stiffness: 300,
              damping: 20,
            }
      }
    >
      <motion.span
        animate={
          prefersReducedMotion
            ? {}
            : {
                scale: [1, 1.1, 1],
                opacity: [0.7, 1, 0.7],
              }
        }
        transition={{
          duration: 1.5,
          repeat: 1,
          delay: 0.5,
        }}
      >
        {count > 9 ? "9+" : count}
      </motion.span>
    </motion.div>
  )
}
