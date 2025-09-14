import { Plus, X } from "lucide-react"
import React, { useState } from "react"

import { SearchFilter } from "@/components/filters/SearchFilter"
import { SourceFilter } from "@/components/filters/SourceFilter"
import { TopicFilter } from "@/components/filters/TopicFilter"
import { QuestionList } from "@/components/questions/QuestionList"
import { useSearchFilter } from "@/hooks/useSearchFilter"
import { useSourceFilter } from "@/hooks/useSourceFilter"
import { useTopicFilter } from "@/hooks/useTopicFilter"
import { Button, Pagination, Stack } from "@/ui"
import { api, type RouterOutputs } from "@/utils/api"

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]

type TestQuestionPickerProps = {
  subjectId: string
  selectedQuestions: Question[]
  isLoadingSelected: boolean
  onAdd: (questionId: string) => void
  onRemove: (questionId: string) => void
}

export function QuestionPicker({
  subjectId,
  selectedQuestions,
  isLoadingSelected,
  onAdd,
  onRemove,
}: TestQuestionPickerProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const { search, debouncedSearch, onSearchChange } = useSearchFilter()
  const { selectedTopicIds, onSelectedTopicIdsChange } =
    useTopicFilter(subjectId)
  const { selectedSources, onSelectedSourcesChange } = useSourceFilter()

  const excludedIds = selectedQuestions.map((q) => q.id)

  const availableQuestionsQuery = api.question.getPaginated.useQuery({
    subjectId: subjectId,
    topicIds: selectedTopicIds,
    search: debouncedSearch,
    sources: selectedSources,
    page: currentPage,
    limit: 5,
    excludeIds: excludedIds,
  })

  const availableQuestions = availableQuestionsQuery.data?.items ?? []

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

  const pagination = (
    <Pagination
      currentPage={currentPage}
      totalPages={availableQuestionsQuery.data?.totalPages}
      onChangePage={setCurrentPage}
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
            isLoading={availableQuestionsQuery.isLoading}
            cardControls={addQuestionControl}
          />
          {!availableQuestionsQuery.isFetching && pagination}
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
        />
      </Stack>
    </div>
  )
}
