import { cn } from "@/styles"
import React from "react"
import { Stack } from "./Stack"

type ContainerProps = {
  children: React.ReactNode
  className?: string
}

export function Container({ children, className = "" }: ContainerProps) {
  return (
    <Stack
      className={cn(
        "mx-auto w-full h-full md:container px-4 pb-4 md:pb-8 md:px-1",
        className
      )}
    >
      {children}
    </Stack>
  )
}
