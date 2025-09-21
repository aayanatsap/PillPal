"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Home, Pill, Users, AlertTriangle, Settings } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useMotion } from "@/components/motion-provider"

const navItems = [
  { href: "/", icon: Home, label: "Dashboard" },
  { href: "/meds", icon: Pill, label: "Medications" },
  { href: "/caregiver", icon: Users, label: "Caregiver" },
  { href: "/alerts", icon: AlertTriangle, label: "Alerts" },
  { href: "/settings", icon: Settings, label: "Settings" },
]

export function Navigation() {
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const { prefersReducedMotion, durations } = useMotion()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <motion.nav
      className={cn("sticky top-0 z-50 bg-white border-b transition-shadow duration-180", scrolled && "shadow-sm")}
      initial={false}
      animate={{
        boxShadow: scrolled
          ? "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)"
          : "0 0 0 0 rgb(0 0 0 / 0), 0 0 0 0 rgb(0 0 0 / 0)",
      }}
      transition={{
        duration: prefersReducedMotion ? 0 : durations.sm / 1000,
      }}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <Link href="/" aria-label="PillPal Home" className="inline-flex items-center">
              <Image src="/pillpal-logo.png" alt="PillPal logo" width={40} height={40} priority />
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    className={cn(
                      "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-600"
                        : "text-neutral-500 hover:text-neutral-700 hover:bg-gray-100",
                    )}
                    whileHover={prefersReducedMotion ? {} : { scale: 1.02, transition: { duration: 0.12 } }}
                    whileTap={prefersReducedMotion ? {} : { scale: 0.98, transition: { duration: 0.12 } }}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </motion.div>
                </Link>
              )
            })}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <motion.button
              className="p-2 rounded-md text-neutral-500 hover:text-neutral-700 hover:bg-gray-100"
              whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
            >
              <Settings className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.nav>
  )
}
