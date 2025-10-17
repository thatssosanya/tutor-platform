import React, { type ElementType } from "react"

import { cn } from "@/styles"

import { type BoxProps,defaultBoxElement } from "./Box"
import { Stack } from "./Stack"

export function Paper<E extends ElementType = typeof defaultBoxElement>({
  className = "",
  as,
  ...props
}: BoxProps<E>) {
  return (
    <Stack
      as={as ?? defaultBoxElement}
      className={cn(
        "rounded-xl bg-paper p-4 shadow-sm inset-shadow-xs shadow-primary sm:p-6",
        className
      )}
      {...props}
    >
      {props.children}
    </Stack>
  )
}
