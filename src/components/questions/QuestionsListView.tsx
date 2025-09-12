import React, { useState } from "react"

import { useSourceFilter } from "@/hooks/useSourceFilter"
import { useSubjectFilter } from "@/hooks/useSubjectFilter"
import { useTopicFilter } from "@/hooks/useTopicFilter"
import { Pagination, Stack } from "@/ui"
import { api, type RouterOutputs } from "@/utils/api"
import { useSearchFilter } from "@/hooks/useSearchFilter"

import { QuestionsViewFilters } from "./QuestionsViewFilters"
import { QuestionsList } from "./QuestionsList"
import { QuestionCreateForm } from "./QuestionCreateForm"

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]

type QuestionsListViewProps = {
  cardControls: (question: Question) => React.ReactNode
  isCreateAllowed?: boolean
}

export function QuestionsListView({
  cardControls,
  isCreateAllowed = false,
}: QuestionsListViewProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const { search, onSearchChange } = useSearchFilter()
  const { selectedSubjectId, onSelectedSubjectIdChange } = useSubjectFilter()
  const { selectedTopicIds, onSelectedTopicIdsChange } =
    useTopicFilter(selectedSubjectId)
  const { selectedSources, onSelectedSourcesChange } = useSourceFilter()

  const questionsQuery = api.question.getPaginated.useQuery(
    {
      subjectId: selectedSubjectId!,
      topicIds: selectedTopicIds,
      search,
      sources: selectedSources,
      page: currentPage,
      limit: 10,
    },
    { enabled: !!selectedSubjectId }
  )

  const questions = questionsQuery.data?.items ?? []

  const pagination = (
    <Pagination
      currentPage={currentPage}
      totalPagesProp={questionsQuery.data?.totalPages}
      onChangePage={setCurrentPage}
      className="self-center"
    />
  )

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
      <div className="md:col-span-1">
        <Stack className="gap-4">
          <Stack>
            <h1 className="text-2xl font-bold">Вопросы</h1>
            <p className="mt-1 text-secondary">
              Управляйте вашей базой вопросов.
            </p>
          </Stack>
          <hr className="border-input" />
          <QuestionsViewFilters
            selectedSubjectId={selectedSubjectId}
            onSelectedSubjectIdChange={onSelectedSubjectIdChange}
            selectedTopicIds={selectedTopicIds}
            onSelectedTopicIdsChange={onSelectedTopicIdsChange}
            search={search}
            onSearchChange={onSearchChange}
            selectedSources={selectedSources}
            onSelectedSourcesChange={onSelectedSourcesChange}
          />
        </Stack>
      </div>
      <div className="md:col-span-3">
        {selectedSubjectId ? (
          <Stack className="gap-4">
            {pagination}
            <QuestionsList
              questions={questions}
              isLoading={questionsQuery.isLoading}
              cardControls={cardControls}
            />
            {!questionsQuery.isFetching && pagination}
            {isCreateAllowed && (
              <QuestionCreateForm subjectId={selectedSubjectId} />
            )}
          </Stack>
        ) : (
          <p className="text-secondary">
            Выберите предмет для просмотра вопросов.
          </p>
        )}
      </div>
    </div>
  )
}
