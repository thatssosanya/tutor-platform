import {
  Field,
  Label,
  Radio,
  RadioGroup as HeadlessRadioGroup,
} from "@headlessui/react"
import { Check } from "lucide-react"
import React from "react"

import { cn } from "@/styles"

import { buttonVariants } from "./Button"
import { withLabel, type WithLabelProps } from "./withLabel"

export type RadioOption<T> = {
  value: T
  label: React.ReactNode
  description?: string
  className?: string
}

type RadioGroupProps<T> = {
  options: RadioOption<T>[]
  value: T | null
  onChange: (value: T) => void
  className?: string
  variant?: "default" | "button" | "button-paper"
  disabled?: boolean
}

function RadioGroupComponent<T extends string | number>({
  options,
  value,
  onChange,
  className,
  variant = "default",
  disabled = false,
}: RadioGroupProps<T>) {
  return (
    <HeadlessRadioGroup
      value={value}
      onChange={onChange}
      className={cn(
        variant === "default" ? "space-y-2" : "flex flex-wrap gap-2",
        className
      )}
      disabled={disabled}
    >
      {options.map((option) => {
        const checked = value === option.value
        return variant === "button" || variant === "button-paper" ? (
          <Radio
            key={String(option.value)}
            value={option.value}
            className={cn(
              buttonVariants({
                size: "sm",
                variant:
                  variant === "button-paper" ? "primary-paper" : "secondary",
              }),
              checked && "bg-accent text-on-accent hover:bg-accent-highlight",
              option.className
            )}
          >
            {option.label}
          </Radio>
        ) : (
          <Field
            key={String(option.value)}
            className={cn(
              "group flex items-center gap-2 pl-2",
              option.className
            )}
          >
            <Radio
              value={option.value}
              className={cn(
                "size-4 shrink-0 flex items-center justify-center rounded-full border border-primary bg-white",
                !checked && !disabled && "cursor-pointer",
                checked && "border-0 bg-text-primary"
              )}
            >
              <Check
                className={cn(
                  "size-3 fill-accent text-on-accent opacity-0 stroke-3 transition-opacity",
                  checked && "opacity-100"
                )}
              />
            </Radio>
            <Label
              className={cn(
                "transition-colors",
                checked ? "text-primary" : "text-primary-highlight",
                !checked &&
                  !disabled &&
                  "cursor-pointer group-hover:text-primary"
              )}
            >
              {option.label}
            </Label>
          </Field>
        )
      })}
    </HeadlessRadioGroup>
  )
}

export const RadioGroup = React.memo(withLabel(RadioGroupComponent)) as <
  T extends string | number,
>(
  props: RadioGroupProps<T> & WithLabelProps
) => React.ReactElement
