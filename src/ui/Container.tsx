import { cn } from "@/styles"
import React from "react"
import { Stack } from "./Stack"

type ContainerProps = {
  children: React.ReactNode
  className?: string
}

export function Container({ children, className = "" }: ContainerProps) {
  return (
    <Stack className={cn("mx-auto w-full h-full md:container", className)}>
      {children}
    </Stack>
  )
}
