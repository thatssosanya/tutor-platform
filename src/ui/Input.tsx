import { Input as HeadlessInput } from "@headlessui/react"
import React, { forwardRef } from "react"

import { cn } from "@/styles"

type InputProps = React.ComponentPropsWithoutRef<"input">

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <HeadlessInput
        ref={ref}
        className={cn(
          "w-full rounded-md border border-input bg-input px-3 py-2 text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent data-disabled:cursor-not-allowed data-disabled:opacity-50",
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"
