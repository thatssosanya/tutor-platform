import { ArrowLeft, Save } from "lucide-react"
import React, { useEffect, useMemo, useState } from "react"

import { useSearchFilter } from "@/hooks/useSearchFilter"
import { useSourceFilter } from "@/hooks/useSourceFilter"
import { useTopicFilter } from "@/hooks/useTopicFilter"
import { Button, Input, Paper, Row, Stack } from "@/ui"
import { api, type RouterOutputs } from "@/utils/api"

import { QuestionPicker } from "../questions/QuestionPicker"
import { TestAssignmentManager } from "./TestAssignmentManager"

type TestQuestion = Exclude<
  RouterOutputs["test"]["getById"],
  null
>["questions"][number]

type TestDetailViewProps = {
  testId: string
  onBack: () => void
}

export function TestDetailView({ testId, onBack }: TestDetailViewProps) {
  const [testName, setTestName] = useState("")
  const utils = api.useUtils()

  // --- Data Queries ---
  const testQuery = api.test.getById.useQuery({ id: testId })
  const test = testQuery.data

  // --- State and Hooks for Question Picker (lifted from QuestionPicker) ---
  const [currentPage, setCurrentPage] = useState(1)
  const { search, debouncedSearch, onSearchChange } = useSearchFilter()
  const { selectedTopicIds, onSelectedTopicIdsChange } = useTopicFilter(
    test?.subjectId ?? null
  )
  const { selectedSources, onSelectedSourcesChange } = useSourceFilter()

  const availableQuestionsQueryVars = {
    subjectId: test?.subjectId ?? "",
    topicIds: selectedTopicIds,
    search: debouncedSearch,
    sources: selectedSources,
    page: currentPage,
    limit: 10,
  }
  const availableQuestionsQuery = api.question.getPaginated.useQuery(
    availableQuestionsQueryVars,
    { enabled: !!test?.subjectId, placeholderData: (prev) => prev }
  )

  const updateTestMutation = api.test.updateName.useMutation({
    onSuccess: async () => {
      await utils.test.getById.invalidate({ id: testId })
      await utils.test.getAllBySubject.invalidate()
    },
  })

  const toggleQuestionMutation = api.test.toggleQuestion.useMutation({
    onMutate: async ({ questionId }) => {
      await utils.test.getById.cancel({ id: testId })
      await utils.question.getPaginated.cancel(availableQuestionsQueryVars)

      const previousTestData = utils.test.getById.getData({ id: testId })
      const previousAvailableData = utils.question.getPaginated.getData(
        availableQuestionsQueryVars
      )

      if (!previousTestData || !previousAvailableData) return

      const isRemoving = previousTestData.questions.some(
        (tq) => tq.questionId === questionId
      )

      if (isRemoving) {
        const questionToMove = previousTestData.questions.find(
          (tq) => tq.questionId === questionId
        )?.question
        if (!questionToMove) return

        utils.test.getById.setData({ id: testId }, (oldTest) =>
          !oldTest
            ? undefined
            : {
                ...oldTest,
                questions: oldTest.questions.filter(
                  (tq) => tq.questionId !== questionId
                ),
              }
        )
        utils.question.getPaginated.setData(
          availableQuestionsQueryVars,
          (oldData) =>
            !oldData
              ? undefined
              : {
                  ...oldData,
                  items: [...oldData.items, questionToMove],
                }
        )
      } else {
        const questionToMove = previousAvailableData.items.find(
          (q) => q.id === questionId
        )
        if (!questionToMove) return

        utils.question.getPaginated.setData(
          availableQuestionsQueryVars,
          (oldData) =>
            !oldData
              ? undefined
              : {
                  ...oldData,
                  items: oldData.items.filter((q) => q.id !== questionId),
                }
        )
        utils.test.getById.setData({ id: testId }, (oldTest) => {
          if (!oldTest) return undefined
          const maxOrder = oldTest.questions.reduce(
            (max, q) => Math.max(max, q.order),
            -1
          )
          const newTestQuestion: TestQuestion = {
            id: `optimistic-${questionId}`,
            order: maxOrder + 1,
            testId: testId,
            questionId: questionId,
            question: questionToMove,
          }
          return {
            ...oldTest,
            questions: [...oldTest.questions, newTestQuestion],
          }
        })
      }

      return { previousTestData, previousAvailableData }
    },
    onError: (err, variables, context) => {
      if (context?.previousTestData) {
        utils.test.getById.setData({ id: testId }, context.previousTestData)
      }
      if (context?.previousAvailableData) {
        utils.question.getPaginated.setData(
          availableQuestionsQueryVars,
          context.previousAvailableData
        )
      }
    },
  })

  useEffect(() => {
    if (test) {
      setTestName(test.name)
    }
  }, [test])

  const handleSaveName = () => {
    if (testName.trim() && testName.trim() !== test?.name) {
      updateTestMutation.mutate({ id: testId, name: testName })
    }
  }

  const handleToggleQuestion = (questionId: string) => {
    toggleQuestionMutation.mutate({ testId, questionId })
  }

  const selectedQuestions = useMemo(
    () => test?.questions.map((q) => q.question) ?? [],
    [test?.questions]
  )
  const selectedQuestionIds = useMemo(
    () => new Set(selectedQuestions.map((q) => q.id)),
    [selectedQuestions]
  )

  const availableQuestions = useMemo(
    () =>
      availableQuestionsQuery.data?.items.filter(
        (q) => !selectedQuestionIds.has(q.id)
      ) ?? [],
    [availableQuestionsQuery.data?.items, selectedQuestionIds]
  )

  const isNameChanged = testName !== test?.name

  if (testQuery.isLoading) {
    return <p>Загрузка данных теста...</p>
  }
  if (!test) {
    return <p>Тест не найден.</p>
  }

  return (
    <Stack className="gap-4">
      <Row className="justify-between">
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад к тестам
        </Button>
      </Row>

      <Paper>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <Input
            value={testName}
            label="Название"
            onChange={(e) => setTestName(e.target.value)}
            variant="primary-paper"
            after={
              <Button
                onClick={handleSaveName}
                disabled={!isNameChanged || updateTestMutation.isPending}
              >
                <Save className="h-4 w-4" />
              </Button>
            }
          />
          <TestAssignmentManager subjectId={test.subjectId} testId={testId} />
        </div>
      </Paper>

      <QuestionPicker
        // Data and state
        subjectId={test.subjectId}
        availableQuestions={availableQuestions}
        selectedQuestions={selectedQuestions}
        isLoadingAvailable={availableQuestionsQuery.isLoading}
        isLoadingSelected={testQuery.isFetching}
        // Pagination
        currentPage={currentPage}
        totalPages={availableQuestionsQuery.data?.totalPages}
        onPageChange={setCurrentPage}
        // Actions
        onAdd={handleToggleQuestion}
        onRemove={handleToggleQuestion}
        // Filters
        search={search}
        onSearchChange={onSearchChange}
        selectedSources={selectedSources}
        onSelectedSourcesChange={onSelectedSourcesChange}
        selectedTopicIds={selectedTopicIds}
        onSelectedTopicIdsChange={onSelectedTopicIdsChange}
      />
    </Stack>
  )
}
