import { Button as HeadlessButton } from "@headlessui/react"
import { cva, type VariantProps } from "class-variance-authority"
import React from "react"

import { cn } from "@/styles"

// TODO fix disabled cursor
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer data-disabled:cursor-pointer data-disabled:pointer-events-none data-disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-accent text-on-accent hover:bg-accent-highlight",
        "primary-paper": "bg-primary text-primary hover:bg-primary-highlight",
        secondary: "bg-input text-primary hover:bg-input-highlight",
        success: "bg-success text-on-accent hover:bg-success-highlight",
        danger: "bg-danger text-on-accent hover:bg-danger-highlight",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      },
      shadows: {
        default: "shadow-primary shadow-sm inset-shadow-2xs",
        none: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
      shadows: "default",
    },
  }
)

export type ButtonProps = React.ComponentProps<typeof HeadlessButton> &
  VariantProps<typeof buttonVariants>

function Button({ className, variant, size, shadows, ...props }: ButtonProps) {
  return (
    <HeadlessButton
      className={cn(buttonVariants({ variant, size, shadows, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
