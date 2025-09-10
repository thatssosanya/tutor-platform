import React from "react"

import { Paper, Row, Stack } from "@/ui"
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
      <Stack className="gap-4">
        <Row className="items-start justify-between gap-4">
          <Stack className="flex-1">
            <p className="text-sm font-semibold text-primary">
              {question.prompt}
            </p>
            <Row>
              <Stack className="text-xl">
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
          </Stack>
          {controls && (
            <div className="flex-shrink-0 absolute right-0 top-0">
              {controls(question)}
            </div>
          )}
        </Row>
        {footer && <div>{footer(question)}</div>}
      </Stack>
    </Paper>
  )
}
