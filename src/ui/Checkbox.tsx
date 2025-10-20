import { Checkbox as HeadlessCheckbox, Field, Label } from "@headlessui/react"
import { Check } from "lucide-react"
import React from "react"

import { cn } from "@/styles"

type CheckboxProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  className?: string
  disabled?: boolean
}

export function Checkbox({
  checked,
  onChange,
  label,
  className,
  disabled,
}: CheckboxProps) {
  return (
    <Field className={cn("group flex items-center gap-2 pl-2", className)}>
      <HeadlessCheckbox
        checked={checked}
        onChange={onChange}
        className={cn(
          "size-4 shrink-0 flex items-center justify-center rounded-sm border border-primary bg-white transition-colors",
          !disabled && "cursor-pointer",
          checked && "border-0 bg-text-primary"
        )}
        disabled={disabled}
      >
        <Check
          className={cn(
            "size-3 fill-accent text-on-accent opacity-0 stroke-3 transition-opacity",
            checked && "opacity-100"
          )}
        />
      </HeadlessCheckbox>
      {label && (
        <Label
          className={cn(
            "transition-colors",
            checked ? "text-primary" : "text-primary-highlight",
            !disabled && [
              "cursor-pointer",
              checked
                ? "hover:text-primary-highlight"
                : "group-hover:text-primary",
            ]
          )}
        >
          {label}
        </Label>
      )}
    </Field>
  )
}
