import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import React from "react"

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
  onDelete?: () => void
}

export function Chip({
  className,
  variant,
  title,
  content,
  onDelete,
  ...props
}: ChipProps) {
  return (
    <div className={cn(chipVariants({ variant, className }))} {...props}>
      <span>{title}</span>
      {content}
      {onDelete && (
        <button
          onClick={onDelete}
          className="-mr-1.5 rounded-full p-0.5 hover:bg-black/10 cursor-pointer"
          aria-label="Удалить"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}
