import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react"
import React from "react"

import { cn } from "@/styles"

export type TabItem = {
  id: string | number
  label: string
  content: React.ReactNode
}

type TabsProps = {
  items: TabItem[]
  className?: string
}

export function Tabs({ items, className }: TabsProps) {
  return (
    <TabGroup as={React.Fragment}>
      <TabList className={cn("flex gap-4 border-b border-primary", className)}>
        {items.map((item) => (
          <Tab
            key={item.id}
            className="rounded-t-lg px-4 py-2 text-sm font-medium text-secondary outline-none data-selected:border-b-2 data-selected:border-accent data-selected:text-primary data-focus:ring-2 data-focus:ring-accent"
          >
            {item.label}
          </Tab>
        ))}
      </TabList>
      <TabPanels className="mt-4">
        {items.map((item) => (
          <TabPanel key={item.id}>{item.content}</TabPanel>
        ))}
      </TabPanels>
    </TabGroup>
  )
}
