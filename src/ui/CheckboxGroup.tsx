import React from "react"

import { cn } from "@/styles"

import { buttonVariants } from "./Button"

export type CheckboxOption<T> = {
  value: T
  label: string
}

type CheckboxGroupProps<T> = {
  options: CheckboxOption<T>[]
  value: T[]
  onChange: (value: T[]) => void
  className?: string
  variant?: "button"
}

function CheckboxGroupComponent<T extends string | number>({
  options,
  value,
  onChange,
  className,
  variant,
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
        variant === "button" ? "flex flex-wrap gap-2" : "space-y-2",
        className
      )}
    >
      {options.map((option) =>
        variant === "button" ? (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => handleToggle(option.value)}
            className={cn(
              buttonVariants({ size: "sm" }),
              "cursor-pointer focus:outline-none",
              selectedValues.has(option.value)
                ? "bg-accent text-on-accent hover:bg-accent-highlight"
                : "bg-input text-primary hover:bg-input-highlight"
            )}
          >
            {option.label}
          </button>
        ) : null
      )}
    </div>
  )
}

export const CheckboxGroup = React.memo(
  CheckboxGroupComponent
) as typeof CheckboxGroupComponent
