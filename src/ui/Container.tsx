import { cn } from "@/styles"
import React from "react"

type ContainerProps = {
  children: React.ReactNode
  className?: string
}

export function Container({ children, className = "" }: ContainerProps) {
  return (
    <div className={cn("mx-auto w-full h-full md:container", className)}>
      {children}
    </div>
  )
}
