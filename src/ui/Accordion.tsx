import { ChevronDown } from "lucide-react"
import React from "react"
import { cn } from "@/styles"
import { Stack } from "./Stack"

type AccordionProps = {
  title: string
  children: React.ReactNode
  isOpen: boolean
  onToggle?: () => void
  className?: string
  buttonClassName?: string
  panelClassName?: string
  noButton?: boolean
}

export function Accordion({
  title,
  children,
  isOpen,
  onToggle,
  className,
  buttonClassName,
  panelClassName,
  noButton,
}: AccordionProps) {
  console.log(isOpen)
  return (
    <Stack className={cn("w-full", className)}>
      {!noButton && (
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={onToggle}
          className={cn(
            "flex w-full items-center justify-between rounded-lg bg-muted px-4 py-2 text-left text-sm font-medium text-primary hover:bg-muted-highlight focus:outline-none focus-visible:ring focus-visible:ring-accent focus-visible:ring-opacity-75 cursor-pointer",
            isOpen && "rounded-b-none",
            buttonClassName
          )}
        >
          <span>{title}</span>
          <ChevronDown
            className={cn(
              "h-5 w-5 text-primary transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>
      )}

      {isOpen && (
        <div
          className={cn(
            "px-4 pb-4 pt-2 text-sm text-foreground",
            panelClassName
          )}
        >
          {children}
        </div>
      )}
    </Stack>
  )
}
