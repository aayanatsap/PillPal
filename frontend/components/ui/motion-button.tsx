"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { useMotion } from "@/components/motion-provider"

export interface MotionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost"
  size?: "sm" | "md" | "lg"
}

const MotionButton = React.forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ className, variant = "primary", size = "md", disabled, children, ...props }, ref) => {
    const { prefersReducedMotion, easing, durations } = useMotion()

    const variants = {
      primary: "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      danger: "bg-[var(--color-alert)] text-white hover:bg-[var(--color-alert)]/90",
      ghost: "hover:bg-accent hover:text-accent-foreground",
    }

    const sizes = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-4 py-2",
      lg: "h-12 px-8 text-lg",
    }

    const motionProps = prefersReducedMotion
      ? {}
      : {
          whileHover: { y: -1, transition: { duration: durations.xs / 1000, ease: easing.easeOutCalm } },
          whileTap: { scale: 0.98, transition: { duration: durations.xs / 1000 } },
        }

    return (
      <motion.button
        className={cn(
          "btn",
          variants[variant],
          sizes[size],
          disabled && "opacity-60 cursor-not-allowed pointer-events-none",
          className,
        )}
        ref={ref}
        disabled={disabled}
        {...motionProps}
        {...props}
      >
        {children}
      </motion.button>
    )
  },
)
MotionButton.displayName = "MotionButton"

export { MotionButton }
