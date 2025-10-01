import React, { useEffect, useState } from "react"
import { Transition } from "@headlessui/react"

import { useSourceFilter } from "@/hooks/useSourceFilter"
import { useSubjectFilter } from "@/hooks/useSubjectFilter"
import { useTopicFilter } from "@/hooks/useTopicFilter"
import { Box, Pagination, Spinner, Stack } from "@/ui"
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
  const [isPaginating, setIsPaginating] = useState(false)
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("left")

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
    { enabled: !!selectedSubjectId, placeholderData: (prev) => prev }
  )

  useEffect(() => {
    // When the new data has arrived, turn off pagination mode.
    // This will trigger the fade-in of the new content.
    if (!questionsQuery.isFetching) {
      setIsPaginating(false)
    }
  }, [questionsQuery.isFetching])

  const handlePageChange = (newPage: number) => {
    if (newPage === currentPage || isPaginating) return

    setSlideDirection(newPage > currentPage ? "left" : "right")
    setIsPaginating(true) // Triggers slide-out and spinner fade-in
    setCurrentPage(newPage) // Triggers the data fetch immediately
  }

  const pagination = (
    <Pagination
      currentPage={currentPage}
      totalPages={questionsQuery.data?.totalPages}
      onChangePage={handlePageChange}
      className="self-center"
    />
  )

  const questions = questionsQuery.data?.items ?? []

  return (
    <Box className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_3fr]">
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
      {selectedSubjectId ? (
        <Stack className="gap-4">
          {pagination}
          <div className="relative min-h-[600px] overflow-hidden">
            <Transition
              show={isPaginating || questionsQuery.isLoading}
              as="div"
              className="transition-opacity duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="absolute inset-0 flex items-center justify-center bg-primary backdrop-blur-sm">
                <Spinner />
              </div>
            </Transition>

            <Transition
              show={!isPaginating}
              // Slide out animation
              as="div"
              leave="transition-transform duration-300 ease-in absolute inset-0 w-full"
              leaveFrom="translate-x-0"
              leaveTo={
                slideDirection === "left"
                  ? "-translate-x-full"
                  : "translate-x-full"
              }
              // Fade in animation
              enter="transition-opacity duration-300 ease-out"
              enterFrom="opacity-0"
              enterTo="opacity-100"
            >
              <QuestionList
                questions={questions}
                isLoading={questionsQuery.isLoading && !isPaginating}
                cardControls={cardControls}
              />
            </Transition>
          </div>
          {!isPaginating && pagination}
          {!isPaginating && isCreateAllowed && (
            <QuestionCreateForm subjectId={selectedSubjectId} />
          )}
        </Stack>
      ) : (
        <p className="text-secondary">
          Выберите предмет для просмотра вопросов.
        </p>
      )}
    </Box>
  )
}
