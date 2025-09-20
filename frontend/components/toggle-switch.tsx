"use client"

import { motion } from "framer-motion"
import { useMotion } from "@/components/motion-provider"

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function ToggleSwitch({ checked, onChange, disabled = false }: ToggleSwitchProps) {
  const { prefersReducedMotion, durations } = useMotion()

  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2 ${
        checked ? "bg-blue-600" : "bg-gray-200"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <motion.span
        className="inline-block h-4 w-4 transform rounded-full bg-white shadow-sm"
        animate={{
          x: checked ? 28 : 4,
        }}
        transition={{
          type: prefersReducedMotion ? "tween" : "spring",
          stiffness: 280,
          damping: 28,
          duration: prefersReducedMotion ? durations.xs / 1000 : undefined,
        }}
      />
    </button>
  )
}
