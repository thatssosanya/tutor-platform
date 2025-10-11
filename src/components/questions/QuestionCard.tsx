import React from "react"

import { Chip, Paper, Row, Stack } from "@/ui"
import { type RouterOutputs } from "@/utils/api"
import { cn } from "@/styles"
import { Markdown } from "../Markdown"
import { QuestionSource } from "@prisma/client"

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]

type QuestionCardProps = {
  question: Question
  size?: "default" | "lg"
  isPromptHidden?: boolean
  controls?: (question: Question) => React.ReactNode
  footer?: (question: Question) => React.ReactNode
}

export function QuestionCard({
  question,
  size = "default",
  isPromptHidden,
  controls,
  footer,
}: QuestionCardProps) {
  return (
    <Paper
      data-id={question.id}
      className={cn(
        "relative w-full h-full gap-4",
        size === "lg" && "flex-grow"
      )}
    >
      <Row>
        <Chip
          variant="primary"
          {...(question.source === QuestionSource.FIPI
            ? {
                as: "a",
                href: `https://ege.fipi.ru/bank/index.php?proj=${question.subjectId}&qid=${question.name}`,
                target: "_blank",
              }
            : null)}
        >
          {"#" + question.name}
        </Chip>
        {controls && <Row className="ml-auto">{controls(question)}</Row>}
      </Row>
      <Stack className="items-start md:flex-row md:items-center md:min-h-40">
        <Stack className={cn("text-lg")}>
          <Markdown>{question.body}</Markdown>
        </Stack>
        <Stack className="ml-auto shrink-0">
          {question.attachments.map((a) => (
            <img key={a.id} src={a.url} />
          ))}
        </Stack>
      </Stack>
      {(!isPromptHidden || footer) && (
        <Stack className={cn("gap-4", size === "lg" && "mt-auto min-h-0")}>
          {!isPromptHidden && (
            <p className="font-semibold text-primary">{question.prompt}</p>
          )}
          {footer && footer(question)}
        </Stack>
      )}
    </Paper>
  )
}
