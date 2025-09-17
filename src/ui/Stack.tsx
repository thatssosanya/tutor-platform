import { cn } from "@/styles"
import React, { type ElementType } from "react"
import { Box, defaultBoxElement, type BoxProps } from "./Box"

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
