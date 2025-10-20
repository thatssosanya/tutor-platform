import { QuestionSource, SolutionType } from "@prisma/client"
import React from "react"

import { cn } from "@/styles"
import { Chip, Paper, Row, Stack } from "@/ui"
import { type RouterOutputs } from "@/utils/api"
import { FIPI_EGE_URL, FIPI_OGE_URL } from "@/utils/consts"

import { Markdown } from "../Markdown"
import { QuestionSolutionBlock } from "./QuestionSolutionBlock"

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]

type QuestionCardProps = {
  question: Question
  size?: "default" | "lg"
  hidePrompt?: boolean
  hideSolutionBlock?: boolean
  controls?: (question: Question) => React.ReactNode
  footer?: (question: Question) => React.ReactNode
}

const TYPES_WITH_SOLUTIONS = [
  SolutionType.SHORT,
  SolutionType.MULTICHOICE,
  SolutionType.MULTIRESPONSE,
  SolutionType.MULTICHOICEGROUP,
] as SolutionType[]

export function QuestionCard({
  question,
  size = "default",
  hidePrompt,
  hideSolutionBlock,
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
                href:
                  (question.subject.grade === "9"
                    ? FIPI_OGE_URL
                    : FIPI_EGE_URL) +
                  `/bank/index.php?proj=${question.subjectId}&qid=${question.name}`,
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
      {(!hidePrompt || !hideSolutionBlock || footer) && (
        <Stack className={cn("gap-4", size === "lg" && "mt-auto min-h-0")}>
          {!hidePrompt && (
            <p className="font-semibold text-primary">{question.prompt}</p>
          )}
          {!hideSolutionBlock &&
            TYPES_WITH_SOLUTIONS.includes(question.solutionType) && (
              <QuestionSolutionBlock question={question} />
            )}
          {footer && footer(question)}
        </Stack>
      )}
    </Paper>
  )
}
