import { Transition } from "@headlessui/react"
import { ExternalLink, ThumbsDown, Trash2 } from "lucide-react"
import { useSession } from "next-auth/react"
import React, { useEffect, useState } from "react"

import { useSearchFilter } from "@/hooks/filters/useSearchFilter"
import { useSourceFilter } from "@/hooks/filters/useSourceFilter"
import { useSubjectFilter } from "@/hooks/filters/useSubjectFilter"
import { useTopicFilter } from "@/hooks/filters/useTopicFilter"
import { Box, Button, Pagination, Row, Spinner, Stack } from "@/ui"
import { api, type RouterInputs, type RouterOutputs } from "@/utils/api"
import { usePermissions } from "@/utils/permissions"

import { SearchFilter } from "../filters/SearchFilter"
import { SourceFilter } from "../filters/SourceFilter"
import { SubjectFilter } from "../filters/SubjectFilter"
import { TopicFilter } from "../filters/TopicFilter"
import { QuestionCreateForm } from "./QuestionCreateForm"
import { QuestionList } from "./QuestionList"

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]

type QuestionListViewProps = {
  allowCreate?: boolean
  onSelect?: (questionId: string) => void
}

export function QuestionListView({
  allowCreate = false,
  onSelect,
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
  const {
    selectedTopicIds: selectedExamPositionIds,
    onSelectedTopicIdsChange: onSelectedExamPositionIdsChange,
  } = useTopicFilter(selectedSubjectId, {
    isQueryParamSyncEnabled: true,
    paramName: "examPosition",
  })
  const { selectedSources, onSelectedSourcesChange } = useSourceFilter({
    isQueryParamSyncEnabled: true,
  })

  const { data: session } = useSession()
  const { isAdmin } = usePermissions()
  const utils = api.useUtils()

  const questionsQueryParams: RouterInputs["question"]["getPaginated"] = {
    verified: true,
    subjectId: selectedSubjectId!,
    topicIds: selectedTopicIds,
    search: debouncedSearch ?? undefined,
    examPositions: selectedExamPositionIds ?? undefined,
    sources: selectedSources,
    page: currentPage,
    limit: 10,
  }

  const questionsQuery = api.question.getPaginated.useQuery(
    questionsQueryParams,
    {
      enabled: !!selectedSubjectId,
      placeholderData: (prev) => prev,
    }
  )

  const updateVerificationMutation =
    api.question.updateVerifications.useMutation({
      onMutate: async (input) => {
        await utils.question.getPaginated.cancel(questionsQueryParams)

        const previousData =
          utils.question.getPaginated.getData(questionsQueryParams)

        if (previousData) {
          const questionIdsToUnverify = Object.keys(input.updates)

          const newData = {
            ...previousData,
            items: previousData.items.filter(
              (question) => !questionIdsToUnverify.includes(question.id)
            ),
          }

          utils.question.getPaginated.setData(questionsQueryParams, newData)
        }

        return { previousData }
      },
      onError: (err, input, context) => {
        if (context?.previousData) {
          utils.question.getPaginated.setData(
            questionsQueryParams,
            context.previousData
          )
        }
      },
      onSettled: () => {
        utils.question.getPaginated.invalidate(questionsQueryParams)
      },
    })

  const deleteMutation = api.question.delete.useMutation({
    onMutate: async ({ id: questionIdToDelete }) => {
      await utils.question.getPaginated.cancel(questionsQueryParams)

      const previousData =
        utils.question.getPaginated.getData(questionsQueryParams)

      if (previousData) {
        const newData = {
          ...previousData,
          items: previousData.items.filter(
            (question) => question.id !== questionIdToDelete
          ),
        }
        utils.question.getPaginated.setData(questionsQueryParams, newData)
      }

      return { previousData }
    },
    onError: (err, input, context) => {
      if (context?.previousData) {
        utils.question.getPaginated.setData(
          questionsQueryParams,
          context.previousData
        )
      }
    },
    onSettled: () => {
      utils.question.getPaginated.invalidate(questionsQueryParams)
    },
  })

  useEffect(() => {
    if (!questionsQuery.isFetching) {
      setIsPaginating(false)
    }
  }, [questionsQuery.isFetching])

  const handlePageChange = (newPage: number) => {
    if (newPage === currentPage || isPaginating) return

    setSlideDirection(newPage > currentPage ? "left" : "right")
    setIsPaginating(true)
    setCurrentPage(newPage)
  }

  const handleDelete = (questionId: string) => {
    if (window.confirm("Вы уверены, что хотите удалить этот вопрос?")) {
      deleteMutation.mutate({ id: questionId })
    }
  }

  const cardControls = (question: Question) => (
    <Row className="items-center gap-2">
      {isAdmin && (
        <Button
          size="sm"
          variant="primary-paper"
          onClick={() =>
            updateVerificationMutation.mutate({
              updates: { [question.id]: false },
            })
          }
        >
          <ThumbsDown className="h-4 w-4" />
        </Button>
      )}
      {question.creatorId === session?.user?.id && (
        <Button
          size="sm"
          variant="primary-paper"
          onClick={() => handleDelete(question.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
      {onSelect && (
        <Button
          size="sm"
          variant="primary-paper"
          onClick={() => onSelect(question.id)}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      )}
    </Row>
  )

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
          <>
            <TopicFilter
              subjectId={selectedSubjectId}
              selectedTopicIds={selectedTopicIds}
              onSelectedTopicIdsChange={onSelectedTopicIdsChange}
            />
            <TopicFilter
              variant="examPosition"
              subjectId={selectedSubjectId}
              selectedTopicIds={selectedExamPositionIds}
              onSelectedTopicIdsChange={onSelectedExamPositionIdsChange}
            />
          </>
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
              as="div"
              leave="transition-transform duration-300 ease-in absolute inset-0 w-full"
              leaveFrom="translate-x-0"
              leaveTo={
                slideDirection === "left"
                  ? "-translate-x-full"
                  : "translate-x-full"
              }
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
          {!isPaginating && allowCreate && (
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
