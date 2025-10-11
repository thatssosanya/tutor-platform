import { cva, type VariantProps } from "class-variance-authority"
import React, { type ElementType } from "react"

import { cn } from "@/styles"
import { Box, defaultBoxElement, type BoxProps } from "./Box"

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

export type ChipProps<E extends ElementType = typeof defaultBoxElement> =
  VariantProps<typeof chipVariants> & {
    title: string
    className?: string
    content?: React.ReactNode
    onClick?: () => void
  } & BoxProps<E>

export function Chip<E extends ElementType = typeof defaultBoxElement>({
  className,
  variant,
  title,
  content,
  onClick,
  as,
  ...props
}: ChipProps<E>) {
  return (
    <Box
      className={cn(
        chipVariants({ variant, className }),
        (onClick || as === "a") && "cursor-pointer"
      )}
      onClick={onClick}
      aria-label={title}
      as={as ?? (onClick ? "button" : "div")}
      {...props}
    >
      <span>{title}</span>
      {content}
    </Box>
  )
}
