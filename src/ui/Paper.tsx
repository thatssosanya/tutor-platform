import { cn } from "@/styles"
import React from "react"

type PaperProps = {
  children: React.ReactNode
  className?: string
}

export function Paper({ children, className = "" }: PaperProps) {
  return (
    <div
      className={cn(
        "rounded-xl bg-paper p-4 shadow-md shadow-primary sm:p-6",
        className
      )}
    >
      {children}
    </div>
  )
}
