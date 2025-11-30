import { QuestionSource, SolutionType } from "@prisma/client"
import { Flag } from "lucide-react"
import React, { useState } from "react"

import { cn } from "@/styles"
import { Chip, Paper, Row, Stack } from "@/ui"
import { type RouterOutputs } from "@/utils/api"
import { FIPI_EGE_URL, FIPI_OGE_URL } from "@/utils/consts"

import { Markdown } from "../Markdown"
import { QuestionSolutionBlock } from "./QuestionSolutionBlock"
import { ReportDialog } from "./ReportDialog"

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]

type QuestionCardProps = {
  question: Question
  size?: "default" | "lg"
  hidePrompt?: boolean
  hideSolutionBlock?: boolean
  controls?: (question: Question) => React.ReactNode
  footer?: (question: Question) => React.ReactNode
  highlightImages?: boolean
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
  controls,
  footer,
  hidePrompt,
  hideSolutionBlock,
  highlightImages,
}: QuestionCardProps) {
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)

  const hasActiveReports = question.metas.some((m) =>
    ["BODY_REPORT", "WORK_REPORT", "HINT_REPORT"].includes(m.type)
  )

  return (
    <>
      <Paper
        data-id={question.id}
        className={cn(
          "w-full h-full gap-4",
          size === "lg" && "flex-grow shrink-0 overflow-y-auto"
        )}
      >
        <Row className="items-center gap-2 shrink-0">
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

          <button
            onClick={() => setIsReportDialogOpen(true)}
            className={cn(
              "p-1.5 rounded-full transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer",
              hasActiveReports
                ? "text-danger"
                : "text-secondary hover:text-danger"
            )}
            title="Сообщить об ошибке"
            type="button"
          >
            <Flag
              className="h-4 w-4"
              fill={hasActiveReports ? "currentColor" : "none"}
            />
          </button>

          {controls && <Row className="ml-auto">{controls(question)}</Row>}
        </Row>
        <Stack className="items-start md:flex-row md:items-center md:min-h-40 shrink-0">
          <Stack className={cn("text-lg")}>
            <Markdown highlightImages={highlightImages}>
              {question.body}
            </Markdown>
          </Stack>
          <Stack className="ml-auto shrink-0">
            {question.attachments.map((a) => (
              <img key={a.id} src={a.url} />
            ))}
          </Stack>
        </Stack>

        {(!hidePrompt || !hideSolutionBlock || footer) && (
          <Stack
            className={cn("gap-4 shrink-0", size === "lg" && "mt-auto min-h-0")}
          >
            {!hidePrompt && (
              <p className="font-semibold text-primary">{question.prompt}</p>
            )}
            {!hideSolutionBlock &&
              TYPES_WITH_SOLUTIONS.includes(question.solutionType) && (
                <QuestionSolutionBlock
                  question={question}
                  highlightImages={highlightImages}
                />
              )}
            {footer && footer(question)}
          </Stack>
        )}
      </Paper>

      <ReportDialog
        isOpen={isReportDialogOpen}
        onClose={() => setIsReportDialogOpen(false)}
        question={question}
      />
    </>
  )
}
