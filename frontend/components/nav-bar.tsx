"use client"

import type React from "react"
import { motion } from "framer-motion"
import { useMotion } from "./motion-provider"
import { ThemeToggle } from "./theme-toggle"
import { cn } from "@/lib/utils"

interface NavBarProps {
  title: string
  className?: string
  children?: React.ReactNode
  showThemeToggle?: boolean
}

export function NavBar({ title, className, children, showThemeToggle = false }: NavBarProps) {
  const { easing, durations } = useMotion()

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: durations.sm / 1000,
        ease: easing.enter,
      }}
      className={cn(
        "sticky top-0 z-50 w-full",
        "bg-background/80 backdrop-blur-sm border-b border-border/50",
        "transition-all duration-300 ease-out",
        "safe-area-top",
        className,
      )}
    >
      <div className="flex h-14 items-center justify-between px-4">
        <h1 className="font-heading text-lg font-semibold text-foreground">{title}</h1>
        <div className="flex items-center space-x-2">
          {children}
          {showThemeToggle && <ThemeToggle size="sm" />}
        </div>
      </div>
    </motion.header>
  )
}
