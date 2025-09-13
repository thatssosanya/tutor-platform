import { cn } from "@/styles"
import React from "react"
import { Stack } from "./Stack"

type PaperProps = {
  children: React.ReactNode
  className?: string
}

export function Paper({ children, className = "" }: PaperProps) {
  return (
    <Stack
      className={cn(
        "rounded-xl bg-paper p-4 shadow-sm inset-shadow-xs shadow-primary sm:p-6",
        className
      )}
    >
      {children}
    </Stack>
  )
}
