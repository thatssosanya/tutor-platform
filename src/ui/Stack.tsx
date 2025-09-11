import { cn } from "@/styles"
import React from "react"

type StackOwnProps<T extends React.ElementType> = {
  children: React.ReactNode
  className?: string
  as?: T
}

type StackProps<T extends React.ElementType> = StackOwnProps<T> &
  Omit<React.ComponentPropsWithoutRef<T>, keyof StackOwnProps<T>>

export function Stack<T extends React.ElementType = "div">({
  children,
  className = "",
  as,
  ...rest
}: StackProps<T>) {
  const Component = as || "div"

  return (
    <Component className={cn("flex flex-col", className)} {...rest}>
      {children}
    </Component>
  )
}
