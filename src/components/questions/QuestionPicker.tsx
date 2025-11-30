import type { QuestionSource } from "@prisma/client"
import { Plus, X } from "lucide-react"
import React, { useState } from "react"

import { SearchFilter } from "@/components/filters/SearchFilter"
import { SourceFilter } from "@/components/filters/SourceFilter"
import { TopicFilter } from "@/components/filters/TopicFilter"
import { Markdown } from "@/components/Markdown"
import { QuestionList } from "@/components/questions/QuestionList"
import { Accordion, Button, Pagination, Stack } from "@/ui"
import { type RouterOutputs } from "@/utils/api"

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]

type QuestionPickerProps = {
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
  selectedExamPositionIds: string[]
  onSelectedExamPositionIdsChange: (ids: string[]) => void
  // Pagination
  currentPage: number
  totalPages: number | undefined | null
  onPageChange: (page: number) => void
}

function QuestionInfoFooter({ question }: { question: Question }) {
  const [isHintOpen, setIsHintOpen] = useState(false)
  const [isWorkOpen, setIsWorkOpen] = useState(false)

  if (!question.hint && !question.work) return null

  return (
    <Stack className="gap-2">
      {question.hint && (
        <Accordion
          title="Подсказка"
          isOpen={isHintOpen}
          onToggle={() => setIsHintOpen(!isHintOpen)}
        >
          <Markdown>{question.hint}</Markdown>
        </Accordion>
      )}
      {question.work && (
        <Accordion
          title="Решение"
          isOpen={isWorkOpen}
          onToggle={() => setIsWorkOpen(!isWorkOpen)}
        >
          <Markdown>{question.work}</Markdown>
        </Accordion>
      )}
    </Stack>
  )
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
  selectedExamPositionIds,
  onSelectedExamPositionIdsChange,
  // Pagination
  currentPage,
  totalPages,
  onPageChange,
}: QuestionPickerProps) {
  const addQuestionControl = (question: Question) =>
    selectedQuestions.some(
      (selectedQuestion) => selectedQuestion.id === question.id
    ) ? (
      <Button
        size="sm"
        variant="primary-paper"
        onClick={() => onRemove(question.id)}
        aria-label="Удалить вопрос"
      >
        <X className="h-4 w-4" />
      </Button>
    ) : (
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
          <TopicFilter
            variant="examPosition"
            subjectId={subjectId}
            selectedTopicIds={selectedExamPositionIds}
            onSelectedTopicIdsChange={onSelectedExamPositionIdsChange}
            multiple={false}
          />
        </Stack>
        <Stack className="gap-4">
          {pagination}
          <QuestionList
            questions={availableQuestions}
            isLoading={isLoadingAvailable}
            cardControls={addQuestionControl}
            cardFooter={(q) => <QuestionInfoFooter question={q} />}
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
          cardFooter={(q) => <QuestionInfoFooter question={q} />}
        />
      </Stack>
    </div>
  )
}
