import { SolutionType, type StudentAnswer } from "@prisma/client"
import { Check, Eye, EyeOff, X } from "lucide-react"
import React, { useState } from "react"

import { Markdown } from "@/components/Markdown"
import { Accordion, Button, Row, Stack } from "@/ui"
import { type RouterOutputs } from "@/utils/api"

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]

type AssignmentSolutionBlockProps = {
  question: Question
  studentAnswer?: StudentAnswer
  showControls?: boolean
}

export function AssignmentSolutionBlock({
  question,
  studentAnswer,
  showControls = false,
}: AssignmentSolutionBlockProps) {
  const [isWorkOpen, setIsWorkOpen] = useState(false)

  if (question.solutionType !== SolutionType.SHORT) {
    return (
      <p className="text-secondary">
        Проверка развернутых ответов пока не поддерживается.
      </p>
    )
  }

  const isCorrect = studentAnswer?.isCorrect

  return (
    <Stack className="w-full gap-4 md:min-h-0">
      {question.work && (
        <Accordion
          title="Решение"
          className="md:min-h-0"
          panelClassName="md:min-h-0 overflow-y-auto px-0 py-4 text-lg"
          isOpen={isWorkOpen}
          onToggle={() => setIsWorkOpen((prev) => !prev)}
        >
          <Markdown>{"# Решение\n\n" + question.work}</Markdown>
        </Accordion>
      )}
      <Row className="items-center gap-2">
        <span className="text-primary text-2xl">
          {studentAnswer?.answer ?? "Нет ответа"}
        </span>
        {studentAnswer &&
          (isCorrect ? (
            <Check className="h-8 w-8 text-success" />
          ) : (
            <X className="h-8 w-8 text-danger" />
          ))}
        {studentAnswer && isCorrect === false && question.solution && (
          <span className="text-secondary text-xl">
            Правильный ответ:{" "}
            <span className="text-primary">{question.solution}</span>
          </span>
        )}
      </Row>
      {showControls && (
        <Stack className="justify-evenly mt-4 gap-4 md:flex-row">
          <Button size="lg" className="gap-4" disabled>
            <Eye />
            Подсказка
          </Button>
          <Button
            size="lg"
            className="gap-4"
            onClick={() => setIsWorkOpen((prev) => !prev)}
            disabled={!question.work}
          >
            {isWorkOpen ? <EyeOff /> : <Eye />}
            Решение
          </Button>
        </Stack>
      )}
    </Stack>
  )
}
