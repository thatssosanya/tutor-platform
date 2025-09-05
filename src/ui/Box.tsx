import { cn } from "@/styles"
import React from "react"

type BoxProps = {
  children: React.ReactNode
  className?: string
}

export function Box({ children, className = "" }: BoxProps) {
  return <div className={cn(className)}>{children}</div>
}
