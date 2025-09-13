import React, { useState } from "react"

import { useSourceFilter } from "@/hooks/useSourceFilter"
import { useSubjectFilter } from "@/hooks/useSubjectFilter"
import { useTopicFilter } from "@/hooks/useTopicFilter"
import { Pagination, Stack } from "@/ui"
import { api, type RouterOutputs } from "@/utils/api"
import { useSearchFilter } from "@/hooks/useSearchFilter"

import { QuestionList } from "./QuestionList"
import { QuestionCreateForm } from "./QuestionCreateForm"
import { SubjectFilter } from "../filters/SubjectFilter"
import { SearchFilter } from "../filters/SearchFilter"
import { SourceFilter } from "../filters/SourceFilter"
import { TopicFilter } from "../filters/TopicFilter"

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]

type QuestionListViewProps = {
  cardControls: (question: Question) => React.ReactNode
  isCreateAllowed?: boolean
}

export function QuestionListView({
  cardControls,
  isCreateAllowed = false,
}: QuestionListViewProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const { search, debouncedSearch, onSearchChange } = useSearchFilter({
    isQueryParamSyncEnabled: true,
  })
  const { selectedSubjectId, onSelectedSubjectIdChange } = useSubjectFilter({
    isStorageSyncEnabled: true,
    isQueryParamSyncEnabled: true,
  })
  const { selectedTopicIds, onSelectedTopicIdsChange } = useTopicFilter(
    selectedSubjectId,
    { isQueryParamSyncEnabled: true }
  )
  const { selectedSources, onSelectedSourcesChange } = useSourceFilter({
    isQueryParamSyncEnabled: true,
  })

  const questionsQuery = api.question.getPaginated.useQuery(
    {
      subjectId: selectedSubjectId!,
      topicIds: selectedTopicIds,
      search: debouncedSearch ?? undefined,
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
          <SubjectFilter
            selectedSubjectId={selectedSubjectId}
            onSelectedSubjectIdChange={onSelectedSubjectIdChange}
          />
          <SearchFilter search={search} onSearchChange={onSearchChange} />
          <SourceFilter
            selectedSources={selectedSources}
            onSelectedSourcesChange={onSelectedSourcesChange}
          />
          {selectedSubjectId && (
            <TopicFilter
              subjectId={selectedSubjectId}
              selectedTopicIds={selectedTopicIds}
              onSelectedTopicIdsChange={onSelectedTopicIdsChange}
            />
          )}
        </Stack>
      </div>
      <div className="md:col-span-3">
        {selectedSubjectId ? (
          <Stack className="gap-4">
            {pagination}
            <QuestionList
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
