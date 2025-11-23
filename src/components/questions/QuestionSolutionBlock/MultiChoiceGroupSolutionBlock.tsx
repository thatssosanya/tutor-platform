import { Check, X } from "lucide-react"
import React, { useMemo } from "react"

import { Markdown } from "@/components/Markdown"
import { Listbox, type ListboxOptionType, Row, Stack } from "@/ui"
import { type RouterOutputs } from "@/utils/api"

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]

type MultiChoiceGroupSolutionBlockProps = {
  question: Question
  value?: string | null
  isCorrect?: boolean
  onChange?: (newValue: string) => void
  onBlur?: () => void
  highlightImages?: boolean
}

export function MultiChoiceGroupSolutionBlock({
  question,
  value,
  onChange,
  highlightImages,
}: MultiChoiceGroupSolutionBlockProps) {
  const isEditable = !!onChange

  const solutionParts = useMemo(
    () => question.solution?.split("|") ?? [],
    [question.solution]
  )
  const valueParts = useMemo(() => value?.split("|") ?? [], [value])

  const handleChange = (i: number, newValue: string) => {
    const newParts = Array(question.options.length)
      .fill(0)
      .map((_, j) => valueParts[j] || "")
    newParts[i] = newValue
    onChange?.(newParts.join("|"))
  }

  return (
    <Row className="w-full items-start gap-4">
      {question.options.map((group, i) => {
        const groupOptions: ListboxOptionType<string>[] =
          group.body.split("|").map((opt) => ({
            value: opt,
            label: opt,
          })) ?? []

        const correctGroupAnswer = solutionParts[i] ?? ""
        const selectedGroupAnswer = valueParts[i] ?? null
        const selectedOption =
          groupOptions.find((o) => o.value === selectedGroupAnswer) ?? null

        return (
          <Stack className="items-center" key={group.order ?? i}>
            <Markdown highlightImages={highlightImages}>{group.order}</Markdown>
            {isEditable ? (
              <Listbox
                options={groupOptions}
                value={selectedOption}
                onChange={(opt) => handleChange(i, opt?.value ?? "")}
                className="min-w-20"
                anchor="top"
              />
            ) : (
              <Row className="items-center gap-2 rounded-md border border-input p-2 min-w-20">
                {selectedGroupAnswer && <span>{selectedGroupAnswer}</span>}
                {selectedGroupAnswer !== null &&
                  (selectedGroupAnswer === correctGroupAnswer ? (
                    <Check className="h-5 w-5 text-success" />
                  ) : (
                    <X className="h-5 w-5 text-danger" />
                  ))}
                {selectedGroupAnswer !== correctGroupAnswer && (
                  <span>
                    {selectedGroupAnswer !== null && "Ответ: "}
                    {correctGroupAnswer}
                  </span>
                )}
              </Row>
            )}
          </Stack>
        )
      })}
    </Row>
  )
}
