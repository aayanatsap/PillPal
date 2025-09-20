"use client"

import type * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // Premium badge styles with glassmorphism
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium motion-safe:transition-all motion-safe:duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-yellow-400/20 text-yellow-400 backdrop-blur-sm",
        secondary: "border-transparent bg-muted/50 text-muted-foreground backdrop-blur-sm",
        destructive: "border-transparent bg-red-500/20 text-red-400 backdrop-blur-sm",
        success: "border-transparent bg-teal-500/20 text-teal-400 backdrop-blur-sm",
        outline: "border-border bg-background/50 text-foreground backdrop-blur-sm",
        risk: {
          low: "border-transparent bg-green-500/20 text-green-400 backdrop-blur-sm",
          medium: "border-transparent bg-yellow-500/20 text-yellow-400 backdrop-blur-sm",
          high: "border-transparent bg-red-500/20 text-red-400 backdrop-blur-sm",
        },
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  asMotion?: boolean
  pulse?: boolean
}

function Badge({ className, variant, asMotion = false, pulse = false, ...props }: BadgeProps) {
  const Component = asMotion ? motion.div : "div"

  return (
    <Component
      className={cn(badgeVariants({ variant }), pulse && "animate-pulse", className)}
      {...(asMotion && {
        initial: { opacity: 0, scale: 0.8 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0.15, ease: [0.32, 0, 0.67, 0] },
      })}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
