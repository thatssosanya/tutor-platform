import {
  Disclosure as HeadlessDisclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react"
import { ChevronDown } from "lucide-react"
import React from "react"

import { cn } from "@/styles"

import { Stack } from "./Stack"

type DisclosureProps = {
  title: string
  children: React.ReactNode
  className?: string
  buttonClassName?: string
  panelClassName?: string
}

export function Disclosure({
  title,
  children,
  className,
  buttonClassName,
  panelClassName,
}: DisclosureProps) {
  return (
    <HeadlessDisclosure as={Stack} className={cn("group w-full", className)}>
      <DisclosureButton
        className={cn(
          "flex w-full items-center justify-between rounded-lg group-data-open:rounded-b-none bg-muted px-4 py-2 text-left text-sm font-medium text-primary hover:bg-muted-highlight focus:outline-none focus-visible:ring focus-visible:ring-accent focus-visible:ring-opacity-75 cursor-pointer",
          buttonClassName
        )}
      >
        <span>{title}</span>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-primary transition-transform group-data-open:rotate-180"
          )}
        />
      </DisclosureButton>
      <DisclosurePanel className={cn("pt-4", panelClassName)}>
        {children}
      </DisclosurePanel>
    </HeadlessDisclosure>
  )
}
