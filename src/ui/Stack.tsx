import React, { type ElementType } from "react"

import { cn } from "@/styles"

import { Box, type BoxProps,defaultBoxElement } from "./Box"

export function Stack<E extends ElementType = typeof defaultBoxElement>({
  className = "",
  as,
  ...props
}: BoxProps<E>) {
  return (
    <Box
      as={as ?? defaultBoxElement}
      className={cn("flex flex-col", className)}
      {...props}
    >
      {props.children}
    </Box>
  )
}
