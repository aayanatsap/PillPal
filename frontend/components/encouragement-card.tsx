"use client"

import { motion } from "framer-motion"
import { CheckCircle, Trophy, Star } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useMotion } from "@/components/motion-provider"
import { useTheme } from "@/hooks/use-theme"
import { cn } from "@/lib/utils"

interface EncouragementCardProps {
  completionRate: number
  streak?: number
  className?: string
}

export function EncouragementCard({ completionRate, streak = 0, className }: EncouragementCardProps) {
  const { prefersReducedMotion, easing, durations } = useMotion()
  const { isDark } = useTheme()

  const isAllComplete = completionRate === 100
  const isHighPerformance = completionRate >= 80

  const getMessage = () => {
    if (isAllComplete) {
      return {
        title: "Perfect day! 🎉",
        subtitle: "All medications taken on schedule",
        icon: Trophy,
        color: isDark ? "text-yellow-400" : "text-yellow-600",
        bgColor: isDark ? "bg-yellow-500/10" : "bg-yellow-100",
      }
    } else if (isHighPerformance) {
      return {
        title: "Great progress!",
        subtitle: `${completionRate}% complete - keep it up!`,
        icon: Star,
        color: isDark ? "text-teal-400" : "text-teal-600",
        bgColor: isDark ? "bg-teal-500/10" : "bg-teal-100",
      }
    } else {
      return {
        title: "You're on track",
        subtitle: `${completionRate}% complete`,
        icon: CheckCircle,
        color: isDark ? "text-blue-400" : "text-blue-600",
        bgColor: isDark ? "bg-blue-500/10" : "bg-blue-100",
      }
    }
  }

  const message = getMessage()
  const Icon = message.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: durations.md / 1000,
        ease: easing.enter,
        delay: 0.4,
      }}
      className={className}
    >
      <Card
        className={cn(
          "p-6 border-l-4 transition-all duration-300 ease-out",
          isAllComplete && isDark && "border-l-yellow-400",
          isAllComplete && !isDark && "border-l-yellow-600",
          isHighPerformance && !isAllComplete && isDark && "border-l-teal-400",
          isHighPerformance && !isAllComplete && !isDark && "border-l-teal-600",
          !isHighPerformance && isDark && "border-l-blue-400",
          !isHighPerformance && !isDark && "border-l-blue-600",
          isAllComplete && !prefersReducedMotion && "animate-pulse",
        )}
      >
        <div className="flex items-center space-x-4">
          <motion.div
            className={cn("w-12 h-12 rounded-xl flex items-center justify-center", message.bgColor)}
            animate={
              isAllComplete && !prefersReducedMotion
                ? {
                    scale: [1, 1.05, 1],
                    rotate: [0, 5, -5, 0],
                  }
                : {}
            }
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              repeatDelay: 3,
            }}
          >
            <Icon className={cn("w-6 h-6", message.color)} />
          </motion.div>

          <div className="space-y-1">
            <h3 className="font-heading text-lg font-semibold text-foreground text-balance">{message.title}</h3>
            <p className="text-muted-foreground text-pretty">{message.subtitle}</p>
            {streak > 0 && (
              <motion.p
                className="text-xs font-medium text-yellow-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                {streak} day streak! 🔥
              </motion.p>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
