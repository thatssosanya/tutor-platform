import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react"
import { ChevronDown } from "lucide-react"
import React from "react"
import { cn } from "@/styles"

type CollapsibleProps = {
  title: string
  children: React.ReactNode
  className?: string
  buttonClassName?: string
}

export function Collapsible({
  title,
  children,
  className,
  buttonClassName,
}: CollapsibleProps) {
  return (
    <Disclosure as="div" className={cn(className)}>
      {({ open }) => (
        <>
          <DisclosureButton
            className={cn(
              "flex w-full items-center justify-between rounded-lg bg-muted px-4 py-2 text-left text-sm font-medium text-primary hover:bg-muted-highlight focus:outline-none focus-visible:ring focus-visible:ring-accent focus-visible:ring-opacity-75 cursor-pointer",
              buttonClassName
            )}
          >
            <span>{title}</span>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-primary transition-transform",
                open && "rotate-180"
              )}
            />
          </DisclosureButton>
          <DisclosurePanel className="pt-4">{children}</DisclosurePanel>
        </>
      )}
    </Disclosure>
  )
}
