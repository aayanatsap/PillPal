"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"

interface MotionContextType {
  prefersReducedMotion: boolean
  easing: {
    enter: [number, number, number, number]
    exit: [number, number, number, number]
  }
  durations: {
    xs: number
    sm: number
    md: number
    lg: number
  }
  stagger: number
}

const MotionContext = createContext<MotionContextType | undefined>(undefined)

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  const value: MotionContextType = {
    prefersReducedMotion,
    easing: {
      enter: [0.32, 0, 0.67, 0],
      exit: [0.16, 1, 0.3, 1],
    },
    durations: {
      xs: 120,
      sm: 180,
      md: 240,
      lg: 320,
    },
    stagger: 60,
  }

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
}

export function useMotion() {
  const context = useContext(MotionContext)
  if (context === undefined) {
    throw new Error("useMotion must be used within a MotionProvider")
  }
  return context
}
