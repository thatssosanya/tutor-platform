import React, { useState } from "react"
import type { Question } from "@prisma/client"
import { Checkbox, Pagination, Stack } from "@/ui"
import { api } from "@/utils/api"
import { QuestionsList } from "../questions/QuestionsList"

type TestQuestionManagerProps = {
  subjectId: string
  checkedQuestionIds: Set<string>
  onToggleQuestion: (questionId: string) => void
}

export function TestQuestionManager({
  subjectId,
  checkedQuestionIds,
  onToggleQuestion,
}: TestQuestionManagerProps) {
  const [currentPage, setCurrentPage] = useState(1)

  const questionsQuery = api.question.getPaginated.useQuery({
    subjectId,
    page: currentPage,
    limit: 5, // A smaller limit for a dialog seems reasonable
  })

  const questionCardControls = (question: Question) => (
    <Checkbox
      checked={checkedQuestionIds.has(question.id)}
      onChange={() => onToggleQuestion(question.id)}
    />
  )

  const pagination = (
    <Pagination
      currentPage={currentPage}
      totalPagesProp={questionsQuery.data?.totalPages}
      onChangePage={setCurrentPage}
      className="self-center"
    />
  )

  return (
    <Stack className="gap-4">
      {pagination}
      <QuestionsList
        questions={questionsQuery.data?.items ?? []}
        isLoading={questionsQuery.isLoading}
        cardControls={questionCardControls}
      />
      {!questionsQuery.isFetching && pagination}
    </Stack>
  )
}
