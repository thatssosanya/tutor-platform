import {
  Listbox as HeadlessListbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react"
import { Check, ChevronsUpDown } from "lucide-react"
import React from "react"

import { cn } from "@/styles"

export type ListboxOptionType<T> = {
  value: T
  label: string
  disabled?: boolean
}

type BaseProps<T> = {
  options: ListboxOptionType<T>[]
  placeholder?: string
  className?: string
}

type SingleSelectProps<T> = {
  multiple?: false
  value: ListboxOptionType<T> | null
  onChange: (value: ListboxOptionType<T>) => void
}

type MultiSelectProps<T> = {
  multiple: true
  value: ListboxOptionType<T>[]
  onChange: (value: ListboxOptionType<T>[]) => void
}

type ListboxProps<T> = BaseProps<T> &
  (SingleSelectProps<T> | MultiSelectProps<T>)

function ListboxComponent<T extends string | number>(props: ListboxProps<T>) {
  const { options, value, onChange, placeholder, multiple, className } = props

  const getButtonText = () => {
    if (multiple) {
      if (value && value.length > 0) {
        return value.map((v) => v.label).join(", ")
      }
    } else {
      if (value) {
        return value.label
      }
    }
    return placeholder
  }

  return (
    <HeadlessListbox value={value} onChange={onChange} multiple={multiple}>
      <div className={cn("relative", className)}>
        <ListboxButton className="relative w-full cursor-default rounded-md border border-input bg-input py-2 pl-3 pr-10 text-left text-primary focus:outline-none focus:ring-2 focus:ring-accent">
          <span className="block truncate">{getButtonText()}</span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronsUpDown className="h-5 w-5 text-secondary" />
          </span>
        </ListboxButton>
        <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-input bg-paper py-1 text-base shadow-lg focus:outline-none sm:text-sm">
          {options.map((option) => (
            <ListboxOption
              key={String(option.value)}
              value={option}
              disabled={option.disabled}
              className="group relative cursor-default select-none py-2 pl-10 pr-4 text-secondary data-focus:bg-muted-highlight data-focus:text-primary"
            >
              <span className="block truncate font-normal group-data-selected:font-semibold">
                {option.label}
              </span>
              <span className="absolute inset-y-0 left-0 hidden items-center pl-3 text-accent group-data-selected:flex">
                <Check className="h-5 w-5" />
              </span>
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </HeadlessListbox>
  )
}

export const Listbox = React.memo(ListboxComponent) as typeof ListboxComponent
