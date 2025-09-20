"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/hooks/use-theme"
import { useMotion } from "@/components/motion-provider"
import { cn } from "@/lib/utils"

interface ThemeToggleProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

export function ThemeToggle({ className, size = "md" }: ThemeToggleProps) {
  const { isDark, toggleTheme, mounted } = useTheme()
  const { prefersReducedMotion, easing, durations } = useMotion()

  if (!mounted) {
    return (
      <div
        className={cn(
          "rounded-full bg-muted/20 animate-pulse",
          size === "sm" && "w-8 h-8",
          size === "md" && "w-10 h-10",
          size === "lg" && "w-12 h-12",
          className,
        )}
      />
    )
  }

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  }

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  }

  return (
    <motion.button
      className={cn(
        "relative rounded-full flex items-center justify-center",
        "bg-background/80 backdrop-blur-sm border border-border/50",
        "text-foreground shadow-lg",
        "motion-safe:transition-all motion-safe:duration-200",
        "motion-safe:hover:scale-105 motion-safe:hover:shadow-xl",
        "motion-safe:active:scale-95",
        sizeClasses[size],
        className,
      )}
      onClick={toggleTheme}
      whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={isDark ? "dark" : "light"}
          initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
          transition={{
            duration: prefersReducedMotion ? 0 : durations.sm / 1000,
            ease: easing.enter,
          }}
        >
          {isDark ? (
            <Sun className="text-yellow-400" size={iconSizes[size]} />
          ) : (
            <Moon className="text-blue-600" size={iconSizes[size]} />
          )}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  )
}
