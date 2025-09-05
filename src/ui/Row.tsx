import { cn } from "@/styles"
import React from "react"

type RowProps = {
  children: React.ReactNode
  className?: string
}

export function Row({ children, className = "" }: RowProps) {
  return (
    <div className={cn("flex flex-row items-center", className)}>
      {children}
    </div>
  )
}
