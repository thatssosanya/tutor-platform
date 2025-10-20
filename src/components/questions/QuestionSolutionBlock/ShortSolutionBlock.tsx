import { Check, X } from "lucide-react"
import React from "react"

import { Input, Row } from "@/ui"
import { type RouterOutputs } from "@/utils/api"

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]

type ShortSolutionBlockProps = {
  question: Question
  value?: string | null
  isCorrect?: boolean
  onChange?: (newValue: string) => void
  onBlur?: () => void
}

export function ShortSolutionBlock({
  question,
  value,
  isCorrect,
  onChange,
  onBlur,
}: ShortSolutionBlockProps) {
  const isEditable = !!onChange

  if (isEditable) {
    return (
      <Input
        placeholder="Ответ"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            ;(e.target as HTMLInputElement).blur()
          }
        }}
      />
    )
  }

  return (
    <Row className="items-center gap-2">
      {value !== undefined && <span className="text-2xl">{value}</span>}
      {isCorrect !== undefined &&
        (isCorrect ? (
          <Check className="h-8 w-8 text-success" />
        ) : (
          <X className="h-8 w-8 text-danger" />
        ))}
      {!isCorrect && (
        <span className="text-2xl">Ответ: {question.solution}</span>
      )}
    </Row>
  )
}
