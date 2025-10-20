import React, { useMemo } from "react"

import { Markdown } from "@/components/Markdown"
import { CheckboxGroup, type CheckboxOption } from "@/ui"
import { type RouterOutputs } from "@/utils/api"

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]

type MultiResponseSolutionBlockProps = {
  question: Question
  value?: string | null
  isCorrect?: boolean
  onChange?: (newValue: string) => void
  onBlur?: () => void
}

export function MultiResponseSolutionBlock({
  question,
  value,
  onChange,
}: MultiResponseSolutionBlockProps) {
  const isEditable = !!onChange

  const solutionSet = useMemo(
    () => new Set(question.solution?.split("|") ?? []),
    [question.solution]
  )
  const valueSet = useMemo(() => new Set(value?.split("|") ?? []), [value])

  const checkboxOptions: CheckboxOption<string>[] = question.options.map(
    (option) => {
      const optionId = option.order ?? option.id
      const isSelected = valueSet.has(optionId)
      const isCorrectOption = solutionSet.has(optionId)

      const label = (
        <div className="flex w-full items-center gap-2">
          {/* {!isEditable && typeof isCorrect !== "undefined" && isSelected && (
            <>
              {isCorrectOption ? (
                <Check className="h-5 w-5 text-success" />
              ) : (
                <X className="h-5 w-5 text-danger" />
              )}
            </>
          )} */}
          <span className="flex-1">
            <Markdown>{option.order + ") " + option.body}</Markdown>
          </span>
        </div>
      )

      const className = (() => {
        if (isEditable) return ""
        if (isSelected && !isCorrectOption)
          return "border-2 rounded-md border-danger"
        if (!!value && isCorrectOption)
          return "border-2 rounded-md border-success"
        return ""
      })()

      return {
        value: optionId,
        label,
        className,
      }
    }
  )

  const displayValue = !!value
    ? Array.from(valueSet)
    : isEditable
      ? []
      : Array.from(solutionSet)

  return (
    <CheckboxGroup
      options={checkboxOptions}
      value={displayValue}
      onChange={(newValues: string[]) => {
        onChange?.(newValues.join("|"))
      }}
      className="w-full"
      disabled={!isEditable}
    />
  )
}
