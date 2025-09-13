import React from "react"

import { Chip, Paper, Row, Stack } from "@/ui"
import { type RouterOutputs } from "@/utils/api"
import Markdown from "react-markdown"
import remarkMath from "remark-math"
import remarkGfm from "remark-gfm"
import rehypeKatex from "rehype-katex"
import "katex/dist/katex.min.css"

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]

type QuestionCardProps = {
  question: Question
  controls?: (question: Question) => React.ReactNode
  footer?: (question: Question) => React.ReactNode
}

export function QuestionCard({
  question,
  controls,
  footer,
}: QuestionCardProps) {
  return (
    <Paper data-id={question.id} className="relative">
      <Stack className="flex-1 gap-4">
        <Row className="mb-4">
          <Chip title={"#" + question.name} variant="primary" />
          {controls && <Row className="ml-auto">{controls(question)}</Row>}
        </Row>
        <Row>
          <Stack className="text-lg sm:max-w-[90%]">
            <Markdown
              remarkPlugins={[remarkMath, remarkGfm]}
              rehypePlugins={[rehypeKatex]}
            >
              {question.body}
            </Markdown>
          </Stack>
          <Stack className="ml-auto shrink-0">
            {question.attachments.map((a) => (
              <img key={a.id} src={a.url} />
            ))}
          </Stack>
        </Row>
        <p className="font-semibold text-primary">{question.prompt}</p>
        {footer && <div>{footer(question)}</div>}
      </Stack>
    </Paper>
  )
}
