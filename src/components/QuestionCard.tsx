import React from "react"

import { Paper, Row, Stack } from "@/ui"
import { type RouterOutputs } from "@/utils/api"

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]

type QuestionCardProps = {
  question: Question
  controls: (question: Question) => React.ReactNode
  footer?: (question: Question) => React.ReactNode
}

export function QuestionCard({
  question,
  controls,
  footer,
}: QuestionCardProps) {
  return (
    <Paper data-id={question.id}>
      <Stack className="gap-4">
        <Row className="items-start justify-between gap-4">
          <Stack className="flex-1">
            <p className="text-sm font-semibold text-primary">
              {question.prompt}
            </p>
            <p className="mt-1 line-clamp-2 text-sm text-secondary">
              {question.body}
            </p>
          </Stack>
          <div className="flex-shrink-0">{controls(question)}</div>
        </Row>
        {footer && <div>{footer(question)}</div>}
      </Stack>
    </Paper>
  )
}
