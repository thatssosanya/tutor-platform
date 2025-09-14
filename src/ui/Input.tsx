import { Input as HeadlessInput } from "@headlessui/react"
import React from "react"

import { cn } from "@/styles"
import { cva, type VariantProps } from "class-variance-authority"
import { withLabel } from "./withLabel"
import { Row } from "./Row"

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

type InputProps = {
  after?: React.ReactNode
} & React.ComponentPropsWithoutRef<"input"> &
  VariantProps<typeof inputVariants>

function InputComponent({ className, variant, after, ...props }: InputProps) {
  const input = (
    <HeadlessInput
      className={cn(inputVariants({ variant, className }))}
      {...props}
    />
  )
  if (!after) {
    return input
  }
  return (
    <Row className="gap-2">
      {input}
      {after}
    </Row>
  )
}

export const Input = React.memo(withLabel(InputComponent))
