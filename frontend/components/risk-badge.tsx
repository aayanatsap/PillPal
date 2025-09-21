"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { useMotion } from "@/components/motion-provider"
import { useTheme } from "@/hooks/use-theme"
import { cn } from "@/lib/utils"
import { getRiskToday, type RiskOut } from "@/lib/api"

interface RiskBadgeProps {
  score: number
  level: "Low" | "Medium" | "High"
  className?: string
}

export function RiskBadge({ score, level, className }: RiskBadgeProps) {
  const [displayScore, setDisplayScore] = useState(0)
  const [progress, setProgress] = useState(0)
  const { prefersReducedMotion, durations, easing } = useMotion()
  const { isDark } = useTheme()

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayScore(score)
      setProgress(score)
      return
    }

    const duration = 1500
    const steps = 60
    const increment = score / steps
    const progressIncrement = score / steps
    let current = 0
    let currentProgress = 0

    const timer = setInterval(() => {
      current += increment
      currentProgress += progressIncrement

      if (current >= score) {
        setDisplayScore(score)
        setProgress(score)
        clearInterval(timer)
      } else {
        setDisplayScore(Math.floor(current))
        setProgress(currentProgress)
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [score, prefersReducedMotion])

  const getRiskConfig = () => {
    switch (level) {
      case "Low":
        return {
          color: isDark ? "text-teal-400" : "text-teal-600",
          ringColor: isDark ? "stroke-teal-400" : "stroke-teal-600",
          bgColor: isDark ? "bg-teal-500/10" : "bg-teal-100",
          variant: "success" as const,
        }
      case "Medium":
        return {
          color: isDark ? "text-yellow-400" : "text-yellow-600",
          ringColor: isDark ? "stroke-yellow-400" : "stroke-yellow-600",
          bgColor: isDark ? "bg-yellow-500/10" : "bg-yellow-100",
          variant: "default" as const,
        }
      case "High":
        return {
          color: isDark ? "text-red-400" : "text-red-600",
          ringColor: isDark ? "stroke-red-400" : "stroke-red-600",
          bgColor: isDark ? "bg-red-500/10" : "bg-red-100",
          variant: "destructive" as const,
        }
    }
  }

  const riskConfig = getRiskConfig()
  const circumference = 2 * Math.PI * 20 // radius = 20
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <motion.div
      className={cn("glass-card glass-3d hover-lift press-compress p-4", className)}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: durations.md / 1000,
        ease: easing.enter,
        delay: 0.2,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">Adherence Risk</p>
          <Badge variant={riskConfig.variant} className="font-medium">
            {level} Risk
          </Badge>
        </div>

        <div className="relative">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 48 48">
            {/* Background ring */}
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              className="text-muted/20"
            />
            {/* Progress ring */}
            <motion.circle
              cx="24"
              cy="24"
              r="20"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              className={riskConfig.ringColor}
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              initial={{ pathLength: 0, strokeDashoffset: circumference }}
              animate={{ pathLength: 1, strokeDashoffset }}
              transition={{
                duration: prefersReducedMotion ? 0 : 1.5,
                ease: easing.enter,
                delay: 0.3,
              }}
            />
          </svg>

          {/* Score display in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.span
              className={cn("text-xl font-bold font-heading", riskConfig.color)}
              key={displayScore}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1, transition: { duration: 0.25 } }}
            >
              {displayScore}
            </motion.span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function RiskBadgeAuto({ className }: { className?: string }) {
  const [risk, setRisk] = useState<RiskOut | null>(null)
  const bucketToLevel = (b: RiskOut['bucket']): RiskBadgeProps['level'] =>
    b === 'low' ? 'Low' : b === 'medium' ? 'Medium' : 'High'

  useEffect(() => {
    let active = true
    getRiskToday().then((r) => {
      if (!active) return
      setRisk(r)
    }).catch(() => {})
    return () => { active = false }
  }, [])

  if (!risk) return <div className={cn("glass-card p-4 h-24 animate-pulse", className)} />
  return <RiskBadge className={className} score={risk.score_0_100} level={bucketToLevel(risk.bucket)} />
}
