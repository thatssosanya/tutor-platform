import React, {
  type ComponentPropsWithoutRef,
  type ElementType,
  type PropsWithChildren,
} from "react"

import { cn } from "@/styles"

type PolymorphicAsProp<E extends ElementType> = {
  as?: E
}

type PolymorphicProps<E extends ElementType> = PropsWithChildren<
  ComponentPropsWithoutRef<E> & PolymorphicAsProp<E>
>

export const defaultBoxElement = "div"

export type BoxProps<E extends ElementType = typeof defaultBoxElement> =
  PolymorphicProps<E>

export function Box<E extends ElementType = typeof defaultBoxElement>({
  children,
  className = "",
  as,
  ...props
}: BoxProps<E>) {
  const Component = as ?? defaultBoxElement

  return (
    <Component className={cn(className)} {...props}>
      {children}
    </Component>
  )
}
