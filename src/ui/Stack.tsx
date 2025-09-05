import { cn } from "@/styles"
import React from "react"

type StackProps = {
  children: React.ReactNode
  className?: string
}

export function Stack({ children, className = "" }: StackProps) {
  return <div className={cn("flex flex-col", className)}>{children}</div>
}
