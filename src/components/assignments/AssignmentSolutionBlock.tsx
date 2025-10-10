import { type StudentAnswer } from "@prisma/client"
import { Check, Eye, EyeOff, X } from "lucide-react"
import React, { useMemo, useState } from "react"

import { Markdown } from "@/components/Markdown"
import { Accordion, Button, Row, Stack } from "@/ui"
import { type RouterOutputs } from "@/utils/api"

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]

type AssignmentSolutionBlockProps = {
  question: Question
  studentAnswer?: StudentAnswer
  showControls?: boolean
  showAnswer?: boolean
  showHint?: boolean
}

export function AssignmentSolutionBlock({
  question,
  studentAnswer,
  showControls = false,
  showAnswer = true,
  showHint = false,
}: AssignmentSolutionBlockProps) {
  const [isOpen, setIsOpen] = useState(showHint)

  const hasAnswer = !!studentAnswer
  const isCorrect = studentAnswer?.isCorrect

  const informationalMarkdown = useMemo(() => {
    if (showControls) return ""

    let content = ""
    if (!hasAnswer) {
      content += `# Ответ: ${question.solution}`
    }
    if (question.work) {
      if (content) content += "\n\n"
      content += `# Решение\n\n${question.work}`
    }
    if (question.hint) {
      if (content) content += "\n\n"
      content += `# Подсказка\n\n${question.hint}`
    }
    return content
  }, [question.hint, question.work, showControls, hasAnswer])

  const AnswerDisplay = () => (
    <Row className="items-center gap-2">
      <span className="text-primary text-2xl">
        {studentAnswer?.answer ?? "Нет ответа"}
      </span>
      {hasAnswer &&
        (isCorrect ? (
          <Check className="h-8 w-8 text-success" />
        ) : (
          <X className="h-8 w-8 text-danger" />
        ))}
      {hasAnswer && !isCorrect && question.solution && (
        <span className="text-secondary text-xl">
          Правильный ответ:{" "}
          <span className="text-primary">{question.solution}</span>
        </span>
      )}
    </Row>
  )

  if (showControls) {
    return (
      <Stack className="w-full gap-4 md:min-h-0">
        <Accordion
          title={hasAnswer ? "Решение" : "Подсказка"}
          className="md:min-h-0"
          panelClassName="md:min-h-0 overflow-y-auto px-0 py-4 text-lg"
          isOpen={isOpen}
          onToggle={() => setIsOpen((prev) => !prev)}
        >
          {showHint || !hasAnswer ? (
            <Markdown>{"# Подсказка\n\n" + (question.hint ?? "")}</Markdown>
          ) : (
            <Markdown>{"# Решение\n\n" + (question.work ?? "")}</Markdown>
          )}
        </Accordion>

        {!showHint && (
          <>
            <AnswerDisplay />

            <Stack className="justify-evenly mt-4 gap-4 md:flex-row">
              <Button
                size="lg"
                className="w-full gap-4"
                onClick={() => setIsOpen((prev) => !prev)}
                disabled={!question.work || !hasAnswer}
              >
                {isOpen && question.work && hasAnswer ? <EyeOff /> : <Eye />}
                Решение
              </Button>
              <Button
                size="lg"
                className="w-full gap-4"
                onClick={() => setIsOpen((prev) => !prev)}
                disabled={!question.hint || hasAnswer}
              >
                {isOpen && question.hint && !hasAnswer ? <EyeOff /> : <Eye />}
                Подсказка
              </Button>
            </Stack>
          </>
        )}
      </Stack>
    )
  }

  return (
    <Stack className="w-full gap-4 md:min-h-0">
      {informationalMarkdown && (
        <Accordion
          title="Подробности (решение, подсказка)"
          className="md:min-h-0"
          panelClassName="md:min-h-0 overflow-y-auto px-0 py-4 text-lg"
          isOpen={isOpen}
          onToggle={() => setIsOpen((prev) => !prev)}
        >
          <Markdown>{informationalMarkdown}</Markdown>
        </Accordion>
      )}
      {showAnswer && <AnswerDisplay />}
    </Stack>
  )
}
