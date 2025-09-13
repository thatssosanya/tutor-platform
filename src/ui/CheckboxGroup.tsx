import React from "react"

import { cn } from "@/styles"

import { buttonVariants } from "./Button"
import { withLabel, type WithLabelProps } from "./withLabel"

export type CheckboxOption<T> = {
  value: T
  label: string
}

type CheckboxGroupProps<T> = {
  options: CheckboxOption<T>[]
  value: T[]
  onChange: (value: T[]) => void
  className?: string
  variant?: "default" | "button" | "button-paper"
}

// TODO add default rendering

function CheckboxGroupComponent<T extends string | number>({
  options,
  value,
  onChange,
  className,
  variant = "default",
}: CheckboxGroupProps<T>) {
  const selectedValues = new Set(value)

  const handleToggle = (optionValue: T) => {
    const newSelectedValues = new Set(selectedValues)
    if (newSelectedValues.has(optionValue)) {
      newSelectedValues.delete(optionValue)
    } else {
      newSelectedValues.add(optionValue)
    }
    onChange(Array.from(newSelectedValues))
  }

  return (
    <div
      className={cn(
        variant === "default" ? "space-y-2" : "flex flex-wrap gap-2",
        className
      )}
    >
      {options.map((option) =>
        variant === "button" || variant === "button-paper" ? (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => handleToggle(option.value)}
            className={cn(
              buttonVariants({
                size: "sm",
                variant:
                  variant === "button-paper" ? "primary-paper" : "secondary",
              }),
              selectedValues.has(option.value) &&
                "bg-accent text-on-accent hover:bg-accent-highlight"
            )}
          >
            {option.label}
          </button>
        ) : null
      )}
    </div>
  )
}

export const CheckboxGroup = React.memo(withLabel(CheckboxGroupComponent)) as <
  T extends string | number,
>(
  props: CheckboxGroupProps<T> & WithLabelProps
) => React.ReactElement
