import React from "react"

import { Markdown } from "@/components/Markdown"
import { RadioGroup, type RadioOption } from "@/ui"
import { type RouterOutputs } from "@/utils/api"

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]

type MultiChoiceSolutionBlockProps = {
  question: Question
  value?: string | null
  isCorrect?: boolean
  onChange?: (newValue: string) => void
  onBlur?: () => void
}

export function MultiChoiceSolutionBlock({
  question,
  value,
  onChange,
}: MultiChoiceSolutionBlockProps) {
  const isEditable = !!onChange
  const solution = question.solution ?? ""

  const radioOptions: RadioOption<string>[] = question.options.map((option) => {
    const optionId = option.order ?? option.id
    const isSelected = value === optionId
    const isCorrectOption = solution === optionId

    const label = (
      <div className="flex w-full items-center gap-2">
        {/* {!isEditable && typeof isCorrect !== "undefined" && isSelected && (
          <>
            {isCorrect ? (
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
  })

  return (
    <RadioGroup
      options={radioOptions}
      value={value ?? (isEditable ? null : solution)}
      onChange={(val) => {
        onChange?.(val ?? "")
      }}
      className="w-full"
      disabled={!isEditable}
    />
  )
}
