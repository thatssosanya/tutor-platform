import { Input as HeadlessInput } from "@headlessui/react"
import { cva, type VariantProps } from "class-variance-authority"
import React from "react"

import { cn } from "@/styles"

import { Row } from "./Row"
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

type InputProps = {
  after?: React.ReactNode
  label?: string
} & React.ComponentPropsWithoutRef<"input"> &
  VariantProps<typeof inputVariants>

function InputComponent({
  className,
  variant,
  after,
  label,
  ...props
}: InputProps) {
  const input = (
    <HeadlessInput
      className={cn(inputVariants({ variant, className }))}
      placeholder={props.placeholder ?? label}
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
