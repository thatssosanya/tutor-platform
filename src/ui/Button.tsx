import { Button as HeadlessButton } from "@headlessui/react"
import { cva, type VariantProps } from "class-variance-authority"
import React, { forwardRef } from "react"

import { cn } from "@/styles"

// TODO fix disabled cursor
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 cursor-pointer data-disabled:cursor-pointer data-disabled:pointer-events-none data-disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-accent text-on-accent hover:bg-accent-highlight",
        secondary: "bg-input text-primary hover:bg-input-highlight",
        danger: "bg-danger text-on-accent hover:bg-danger-highlight",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ComponentProps<typeof HeadlessButton>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <HeadlessButton
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
