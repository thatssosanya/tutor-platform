import { cva, type VariantProps } from "class-variance-authority"
import React, { type ElementType } from "react"

import { cn } from "@/styles"

const chipVariants = cva(
  "inline-flex items-center gap-x-2 rounded-full px-3 py-1 text-sm font-medium shadow-primary shadow-sm inset-shadow-2xs cursor-default",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary",
        secondary: "bg-primary text-secondary",
        danger: "bg-danger/50 text-danger",
        success: "bg-success/50 text-success",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  }
)

export interface ChipProps extends VariantProps<typeof chipVariants> {
  title: string
  className?: string
  content?: React.ReactNode
  onClick?: () => void
  as?: ElementType
}

export function Chip({
  className,
  variant,
  title,
  content,
  onClick,
  as,
  ...props
}: ChipProps) {
  const Component = as ?? (onClick ? "button" : "div")
  return (
    <Component
      className={cn(
        chipVariants({ variant, className }),
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
      aria-label={title}
      {...props}
    >
      <span>{title}</span>
      {content}
    </Component>
  )
}
