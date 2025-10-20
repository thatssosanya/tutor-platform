import React from "react"

import { Markdown } from "@/components/Markdown"
import { type RouterOutputs } from "@/utils/api"

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]

type LongSolutionBlockProps = {
  question: Question
  value?: string | null
  isCorrect?: boolean
  onChange?: (newValue: string) => void
  onBlur?: () => void
}

export function LongSolutionBlock({
  question,
  value,
  onChange,
}: LongSolutionBlockProps) {
  const isEditable = !!onChange
  const displayValue = value ?? question.solution ?? ""

  if (isEditable) {
    return (
      <textarea
        placeholder="Подробный ответ"
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        className="w-full rounded-md bg-input px-3 py-2 text-primary placeholder:text-muted shadow-primary shadow-sm inset-shadow-2xs focus:outline-none focus:ring-2 focus:ring-accent"
      />
    )
  }

  return <Markdown>{displayValue}</Markdown>
}
