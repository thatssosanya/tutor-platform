import {
  Listbox as HeadlessListbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Portal,
} from "@headlessui/react"
import { Check, ChevronsUpDown } from "lucide-react"
import React, { useEffect, useRef } from "react"

import { cn } from "@/styles"
import { cva, type VariantProps } from "class-variance-authority"
import { withLabel, type WithLabelProps } from "./withLabel"

const listboxButtonVariants = cva(
  "relative w-full cursor-default rounded-md py-2 pl-3 pr-10 text-left shadow-primary shadow-sm inset-shadow-2xs focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer",
  {
    variants: {
      variant: {
        primary: "bg-input text-primary placeholder:text-muted",
        "primary-paper": "bg-primary text-primary placeholder:text-muted",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  }
)

export type ListboxOptionType<T> = {
  value: T | null
  label: string
  disabled?: boolean
}

type BaseProps<T> = {
  options: ListboxOptionType<T>[]
  placeholder?: string
  anchor?: string
  className?: string
  onClose?: () => void
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
  getButtonText?: (
    value: ListboxOptionType<T>[],
    options: ListboxOptionType<T>[]
  ) => string
}

type ListboxProps<T> = BaseProps<T> &
  (SingleSelectProps<T> | MultiSelectProps<T>) &
  VariantProps<typeof listboxButtonVariants>

function ListboxComponent<T extends string | number>(props: ListboxProps<T>) {
  const {
    options,
    value,
    onChange,
    placeholder,
    multiple,
    anchor,
    variant,
    className,
    onClose,
  } = props
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = rootRef.current
    if (!node || !onClose) return

    let wasOpen = node.getAttribute("data-headlessui-state")?.includes("open")

    const observer = new MutationObserver(() => {
      const isOpen = node
        .getAttribute("data-headlessui-state")
        ?.includes("open")
      if (wasOpen && !isOpen) {
        onClose()
      }
      wasOpen = isOpen
    })

    observer.observe(node, {
      attributes: true,
      attributeFilter: ["data-headlessui-state"],
    })

    return () => observer.disconnect()
  }, [onClose])

  const getButtonDisplay = () => {
    if (multiple) {
      const multiProps = props as MultiSelectProps<T>
      const selectedOptions = multiProps.value
      const allOptions = options

      if (
        selectedOptions.length === 0 ||
        selectedOptions.length === allOptions.length
      ) {
        return placeholder
      }

      if (multiProps.getButtonText) {
        return multiProps.getButtonText(selectedOptions, allOptions)
      }

      return selectedOptions.map((v) => v.label).join(", ")
    } else {
      const singleProps = props as SingleSelectProps<T>
      if (singleProps.value) {
        return singleProps.value.label
      }
    }
    return placeholder
  }

  return (
    <HeadlessListbox
      as="div"
      ref={rootRef}
      value={value}
      onChange={onChange}
      multiple={multiple}
      className={cn("relative", className)}
    >
      <ListboxButton className={listboxButtonVariants({ variant, className })}>
        <span className="block truncate">{getButtonDisplay()}</span>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronsUpDown className="h-5 w-5 text-secondary" />
        </span>
      </ListboxButton>
      <ListboxOptions
        // @ts-expect-error headless doesn't export this type https://headlessui.com/react/listbox#positioning-the-dropdown
        anchor={anchor}
        className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-paper py-1 text-base shadow-primary shadow-lg inset-shadow-xs focus:outline-none sm:text-sm"
      >
        {options.map((option) => (
          <ListboxOption
            key={String(option.value)}
            value={option}
            disabled={option.disabled}
            className="group relative select-none py-2 pl-10 pr-4 text-primary data-disabled:text-secondary data-focus:bg-muted-highlight cursor-pointer"
          >
            <span
              className={cn(
                "block truncate font-normal group-data-selected:font-semibold",
                option.label.startsWith("  ") && "pl-4"
              )}
            >
              {option.label}
            </span>
            <span className="absolute inset-y-0 left-0 hidden items-center pl-3 text-accent group-data-selected:flex">
              <Check className="h-5 w-5" />
            </span>
          </ListboxOption>
        ))}
      </ListboxOptions>
    </HeadlessListbox>
  )
}

export const Listbox = React.memo(withLabel(ListboxComponent)) as <
  T extends string | number,
>(
  props: ListboxProps<T> & WithLabelProps
) => React.ReactElement
