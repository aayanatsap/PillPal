"use client"

import type * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium motion-safe:transition-all motion-safe:duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/50 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-lg motion-safe:active:scale-98",
  {
    variants: {
      variant: {
        default: "bg-yellow-400 text-black shadow-md hover:bg-yellow-300 font-semibold",
        destructive: "bg-red-500 text-white shadow-md hover:bg-red-600",
        outline: "border border-border bg-background/50 backdrop-blur-sm shadow-sm hover:bg-muted/50 text-foreground",
        secondary: "bg-muted text-muted-foreground shadow-sm hover:bg-muted/80",
        ghost: "hover:bg-muted/50 text-foreground",
        link: "text-yellow-400 underline-offset-4 hover:underline hover:text-yellow-300",
        success: "bg-teal-500 text-white shadow-md hover:bg-teal-600",
      },
      size: {
        default: "h-10 px-6 py-2.5",
        sm: "h-8 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "size-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }
