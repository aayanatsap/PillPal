"use client"

import { motion } from "framer-motion"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home, Pill, AlertTriangle, Users, Settings } from "lucide-react"
import { useMotion } from "./motion-provider"
import { useTheme } from "@/hooks/use-theme"
import { cn } from "@/lib/utils"

const tabs = [
  { href: "/", icon: Home, label: "Dashboard" },
  { href: "/meds", icon: Pill, label: "Meds" },
  { href: "/alerts", icon: AlertTriangle, label: "Alerts" },
  { href: "/caregiver", icon: Users, label: "Caregiver" },
  { href: "/settings", icon: Settings, label: "Settings" },
]

export function TabBar() {
  const pathname = usePathname()
  const { easing, durations } = useMotion()
  const { isDark } = useTheme()

  const getActiveColor = () => {
    return isDark ? "text-yellow-400" : "text-blue-600"
  }

  const getActiveIndicatorColor = () => {
    return isDark ? "bg-yellow-400" : "bg-blue-600"
  }

  return (
    <motion.nav
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: durations.md / 1000,
        ease: easing.enter,
      }}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-background/95 backdrop-blur-sm border-t border-border/50",
        "transition-all duration-300 ease-out",
        "safe-area-bottom",
      )}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab, index) => {
          const isActive = pathname === tab.href
          const Icon = tab.icon

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center",
                "min-w-0 flex-1 px-2 py-2 rounded-xl",
                "motion-safe:transition-all motion-safe:duration-150",
                "motion-safe:hover:bg-muted/50",
                isActive && getActiveColor(),
              )}
            >
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1.1 : 1,
                  y: isActive ? -2 : 0,
                }}
                transition={{
                  duration: durations.sm / 1000,
                  ease: easing.enter,
                  delay: index * 0.02,
                }}
                className="relative"
              >
                <Icon size={20} className={cn("mb-1", isActive ? getActiveColor() : "text-muted-foreground")} />
                {isActive && (
                  <motion.div
                    layoutId="nav-active"
                    className={cn("absolute bottom-0 h-0.5 w-6 rounded-full left-1/2 -translate-x-1/2", getActiveIndicatorColor())}
                    transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  />
                )}
              </motion.div>
              <span
                className={cn("text-xs font-medium truncate mt-1", isActive ? getActiveColor() : "text-muted-foreground")}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </motion.nav>
  )
}
