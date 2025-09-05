import {
  Popover as HeadlessPopover,
  PopoverButton as HeadlessPopoverButton,
  PopoverPanel as HeadlessPopoverPanel,
  Portal,
  Transition,
  type PopoverPanelProps as HeadlessPopoverPanelProps,
} from "@headlessui/react"
import React, { Fragment } from "react"

import { cn } from "@/styles"

const Root = HeadlessPopover
const Button = HeadlessPopoverButton

type PopoverPanelProps = {
  children: HeadlessPopoverPanelProps["children"]
  className?: string
}

function Panel({ children, className }: PopoverPanelProps) {
  return (
    <Transition
      as={Fragment}
      enter="transition ease-out duration-200"
      enterFrom="opacity-0 translate-y-1"
      enterTo="opacity-100 translate-y-0"
      leave="transition ease-in duration-150"
      leaveFrom="opacity-100 translate-y-0"
      leaveTo="opacity-0 translate-y-1"
    >
      <Portal>
        <HeadlessPopoverPanel
          anchor="bottom"
          className={cn(
            "z-50 mt-2 w-72 rounded-md border border-primary bg-paper p-4 shadow-lg focus:outline-none",
            className
          )}
        >
          {children}
        </HeadlessPopoverPanel>
      </Portal>
    </Transition>
  )
}

export const Popover = { Root, Button, Panel }

type SimplePopoverProps = {
  buttonContent: React.ReactNode
  children: PopoverPanelProps["children"]
  panelClassName?: string
  className?: string
}

export function SimplePopover({
  buttonContent,
  children,
  panelClassName,
  className,
}: SimplePopoverProps) {
  return (
    <Popover.Root className={cn("relative", className)}>
      <Popover.Button as="span">{buttonContent}</Popover.Button>
      <Popover.Panel className={panelClassName}>{children}</Popover.Panel>
    </Popover.Root>
  )
}
