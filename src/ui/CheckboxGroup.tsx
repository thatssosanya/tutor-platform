import React from "react"

import { cn } from "@/styles"

import { buttonVariants } from "./Button"
import { Checkbox } from "./Checkbox"
import { withLabel, type WithLabelProps } from "./withLabel"

export type CheckboxOption<T> = {
  value: T
  label: React.ReactNode
  className?: string
}

type CheckboxGroupProps<T> = {
  options: CheckboxOption<T>[]
  value: T[]
  onChange: (value: T[]) => void
  className?: string
  variant?: "default" | "button" | "button-paper"
  disabled?: boolean
}

function CheckboxGroupComponent<T extends string | number>({
  options,
  value,
  onChange,
  className,
  variant = "default",
  disabled = false,
}: CheckboxGroupProps<T>) {
  const selectedValues = new Set(value)

  const handleToggle = (optionValue: T) => {
    if (disabled) return
    const newSelectedValues = options.reduce((a, o) => {
      const isToggling = o.value === optionValue
      if (
        (selectedValues.has(o.value) && !isToggling) ||
        (!selectedValues.has(o.value) && isToggling)
      ) {
        return [...a, o.value]
      } else {
        return a
      }
    }, [] as T[])
    onChange(newSelectedValues)
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
            disabled={disabled}
            className={cn(
              buttonVariants({
                size: "sm",
                variant:
                  variant === "button-paper" ? "primary-paper" : "secondary",
              }),
              selectedValues.has(option.value) &&
                "bg-accent text-on-accent hover:bg-accent-highlight",
              option.className
            )}
          >
            {option.label}
          </button>
        ) : (
          <Checkbox
            key={String(option.value)}
            checked={selectedValues.has(option.value)}
            onChange={() => handleToggle(option.value)}
            label={option.label as string}
            className={option.className}
            disabled={disabled}
          />
        )
      )}
    </div>
  )
}

export const CheckboxGroup = React.memo(withLabel(CheckboxGroupComponent)) as <
  T extends string | number,
>(
  props: CheckboxGroupProps<T> & WithLabelProps
) => React.ReactElement
