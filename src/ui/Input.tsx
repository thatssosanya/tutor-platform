import { Input as HeadlessInput } from "@headlessui/react"
import React from "react"

import { cn } from "@/styles"
import { cva, type VariantProps } from "class-variance-authority"
import { withLabel } from "./withLabel"

const inputVariants = cva(
  "w-full rounded-md bg-input px-3 py-2 shadow-primary shadow-sm inset-shadow-2xs focus:outline-none focus:ring-2 focus:ring-accent data-disabled:cursor-not-allowed data-disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-input text-primary placeholder:text-muted",
        "primary-paper": "bg-primary text-primary placeholder:text-muted",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  }
)

type InputProps = React.ComponentPropsWithoutRef<"input"> &
  VariantProps<typeof inputVariants>

function InputComponent({ className, variant, ...props }: InputProps) {
  return (
    <HeadlessInput
      className={cn(inputVariants({ variant, className }))}
      {...props}
    />
  )
}

export const Input = React.memo(withLabel(InputComponent))
