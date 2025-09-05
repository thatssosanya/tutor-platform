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

export type RadioOption<T> = {
  value: T
  label: string
  description?: string
}

type RadioGroupProps<T> = {
  options: RadioOption<T>[]
  value: T | null
  onChange: (value: T) => void
  className?: string
  variant?: "default" | "button"
}

function RadioGroupComponent<T extends string | number>({
  options,
  value,
  onChange,
  className,
  variant = "default",
}: RadioGroupProps<T>) {
  return (
    <HeadlessRadioGroup
      value={value}
      onChange={onChange}
      className={cn(
        variant === "default" ? "space-y-2" : "flex flex-wrap gap-2",
        className
      )}
    >
      {options.map((option) =>
        variant === "button" ? (
          <Radio
            key={String(option.value)}
            value={option.value}
            className={cn(
              buttonVariants({ size: "sm" }),
              "cursor-pointer focus:outline-none data-checked:cursor-default",
              "bg-input text-primary hover:bg-input-highlight",
              "data-checked:bg-accent data-checked:text-on-accent data-checked:hover:bg-accent-highlight"
            )}
          >
            {option.label}
          </Radio>
        ) : (
          <Field
            key={String(option.value)}
            className="group flex items-center gap-2"
          >
            <Radio
              value={option.value}
              className="group/radio peer/radio flex size-4 items-center justify-center rounded-full border border-primary bg-white data-checked:border-0 data-checked:bg-text-primary transition-colors cursor-pointer data-checked:cursor-default"
            >
              <Check className="h-3 w-3 fill-accent text-on-accent opacity-0 group-data-checked/radio:opacity-100 stroke-3 transition-opacity" />
            </Radio>
            <Label className="cursor-pointer peer-data-checked/radio:cursor-default group-hover:text-primary-highlight peer-data-checked/radio:group-hover:text-primary">
              {option.label}
            </Label>
          </Field>
        )
      )}
    </HeadlessRadioGroup>
  )
}

export const RadioGroup = React.memo(RadioGroupComponent) as <
  T extends string | number,
>(
  props: RadioGroupProps<T>
) => React.ReactElement
