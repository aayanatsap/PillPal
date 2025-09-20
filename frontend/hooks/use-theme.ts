"use client"

import { useTheme as useNextTheme } from "next-themes"
import { useEffect, useState } from "react"

export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useNextTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return {
    theme: mounted ? resolvedTheme : "dark",
    setTheme,
    toggleTheme,
    mounted,
    isDark: mounted ? resolvedTheme === "dark" : true,
    isLight: mounted ? resolvedTheme === "light" : false,
  }
}
