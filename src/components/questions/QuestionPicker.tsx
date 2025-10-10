import { Plus, X } from "lucide-react"
import React from "react"

import { SearchFilter } from "@/components/filters/SearchFilter"
import { SourceFilter } from "@/components/filters/SourceFilter"
import { TopicFilter } from "@/components/filters/TopicFilter"
import { QuestionList } from "@/components/questions/QuestionList"
import { Button, Pagination, Stack } from "@/ui"
import { type RouterOutputs } from "@/utils/api"
import type { QuestionSource } from "@prisma/client"
import { AssignmentSolutionBlock } from "../assignments/AssignmentSolutionBlock"

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]

type TestQuestionPickerProps = {
  subjectId: string
  // Selected questions
  selectedQuestions: Question[]
  isLoadingSelected: boolean
  onRemove: (questionId: string) => void
  // Available questions
  availableQuestions: Question[]
  isLoadingAvailable: boolean
  onAdd: (questionId: string) => void
  // Filters
  search: string
  onSearchChange: (value: string) => void
  selectedSources: QuestionSource[]
  onSelectedSourcesChange: (sources: QuestionSource[]) => void
  selectedTopicIds: string[]
  onSelectedTopicIdsChange: (ids: string[]) => void
  // Pagination
  currentPage: number
  totalPages: number | undefined | null
  onPageChange: (page: number) => void
}

export function QuestionPicker({
  subjectId,
  // Selected
  selectedQuestions,
  isLoadingSelected,
  onRemove,
  // Available
  availableQuestions,
  isLoadingAvailable,
  onAdd,
  // Filters
  search,
  onSearchChange,
  selectedSources,
  onSelectedSourcesChange,
  selectedTopicIds,
  onSelectedTopicIdsChange,
  // Pagination
  currentPage,
  totalPages,
  onPageChange,
}: TestQuestionPickerProps) {
  const addQuestionControl = (question: Question) => (
    <Button
      size="sm"
      variant="primary-paper"
      onClick={() => onAdd(question.id)}
      aria-label="Добавить вопрос"
    >
      <Plus className="h-4 w-4" />
    </Button>
  )

  const removeQuestionControl = (question: Question) => (
    <Button
      size="sm"
      variant="primary-paper"
      onClick={() => onRemove(question.id)}
      aria-label="Удалить вопрос"
    >
      <X className="h-4 w-4" />
    </Button>
  )

  const cardFooter = (question: Question) => (
    <AssignmentSolutionBlock question={question} showAnswer={false} />
  )

  const pagination = (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      onChangePage={onPageChange}
      className="self-center"
    />
  )

  return (
    <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
      <Stack className="gap-4">
        <h3 className="text-lg font-semibold">Доступные вопросы</h3>
        <Stack className="gap-4">
          <SearchFilter search={search} onSearchChange={onSearchChange} />
          <SourceFilter
            selectedSources={selectedSources}
            onSelectedSourcesChange={onSelectedSourcesChange}
          />
          <TopicFilter
            subjectId={subjectId}
            selectedTopicIds={selectedTopicIds}
            onSelectedTopicIdsChange={onSelectedTopicIdsChange}
          />
        </Stack>
        <Stack className="gap-4">
          {pagination}
          <QuestionList
            questions={availableQuestions}
            isLoading={isLoadingAvailable}
            cardControls={addQuestionControl}
            cardFooter={cardFooter}
          />
          {!isLoadingAvailable && pagination}
        </Stack>
      </Stack>

      <Stack className="gap-4">
        <h3 className="text-lg font-semibold">
          Выбранные вопросы ({selectedQuestions.length})
        </h3>
        <QuestionList
          questions={selectedQuestions}
          isLoading={isLoadingSelected}
          cardControls={removeQuestionControl}
          cardFooter={cardFooter}
        />
      </Stack>
    </div>
  )
}
