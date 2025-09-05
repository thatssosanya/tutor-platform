import { Checkbox as HeadlessCheckbox, Field, Label } from "@headlessui/react"
import { Check } from "lucide-react"
import React from "react"

import { cn } from "@/styles"

type CheckboxProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  className?: string
}

export function Checkbox({
  checked,
  onChange,
  label,
  className,
}: CheckboxProps) {
  return (
    <Field className={cn("flex items-center gap-2", className)}>
      <HeadlessCheckbox
        checked={checked}
        onChange={onChange}
        className="group/check peer/radio flex size-4 items-center justify-center rounded-sm border border-primary bg-white data-checked:border-0 data-checked:bg-text-primary transition-colors cursor-pointer"
      >
        <Check className="h-3 w-3 fill-accent text-on-accent opacity-0 group-data-checked/check:opacity-100 stroke-3 transition-opacity" />
      </HeadlessCheckbox>
      {label && (
        <Label className="cursor-pointer group-hover:text-primary-highlight peer-data-checked/check:group-hover:text-primary">
          {label}
        </Label>
      )}
    </Field>
  )
}
