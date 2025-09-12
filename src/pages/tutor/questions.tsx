import { SlidersHorizontal, Trash2 } from "lucide-react"
import { useSession } from "next-auth/react"
import Head from "next/head"
import React, { useEffect, useState } from "react"

import { QuestionsListView } from "@/components/questions/QuestionsListView"
import { TestsList } from "@/components/tests/TestsList"
import ProtectedLayout from "@/layouts/ProtectedLayout"
import { Button, Checkbox, Container, Dialog, Row, Stack } from "@/ui"
import { api, type RouterOutputs } from "@/utils/api"
import { PermissionBit } from "@/utils/permissions"
import { skipToken } from "@tanstack/react-query"

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]
type Test = RouterOutputs["test"]["getAllBySubject"][number]

function TestManagementDialog({
  isOpen,
  onClose,
  question,
  tests,
  checkedTestIds,
  onToggleTest,
  isLoading,
}: {
  isOpen: boolean
  onClose: () => void
  question: Question
  tests: Test[]
  checkedTestIds: Set<string>
  onToggleTest: (testId: string) => void
  isLoading: boolean
}) {
  const testCardControls = (testId: string) => (
    <Checkbox
      checked={checkedTestIds.has(testId)}
      onChange={() => onToggleTest(testId)}
    />
  )

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Вопрос: ${question.prompt}`}
      className="bg-primary shadow-2xl md:container min-h-50"
    >
      <Stack className="mt-4 gap-2">
        <h4 className="font-semibold text-primary">Добавить в тест</h4>
        <TestsList
          tests={tests}
          isLoading={isLoading}
          cardControls={testCardControls}
        />
      </Stack>
    </Dialog>
  )
}

export default function TutorQuestionsPage() {
  const [managingQuestion, setManagingQuestion] = useState<Question | null>(
    null
  )
  const [editedTestIds, setEditedTestIds] = useState<Set<string>>(new Set())

  const { data: session } = useSession()
  const utils = api.useUtils()

  const subjectIdForDialog = managingQuestion?.subjectId

  // Data Queries
  const testsQuery = api.test.getAllBySubject.useQuery(
    { subjectId: subjectIdForDialog! },
    { enabled: !!subjectIdForDialog }
  )
  const testsWithQuestionQuery = api.test.getTestsContainingQuestion.useQuery(
    !!managingQuestion && !!subjectIdForDialog
      ? {
          questionId: managingQuestion.id,
          subjectId: subjectIdForDialog,
        }
      : skipToken
  )

  // Mutations
  const deleteMutation = api.question.delete.useMutation({
    onSuccess: () => {
      utils.question.getPaginated.invalidate()
    },
  })
  const updateQuestionInTestsMutation =
    api.test.updateQuestionInTests.useMutation({
      onSuccess: (_, variables) => {
        utils.test.getTestsContainingQuestion.invalidate({
          questionId: variables.questionId,
          subjectId: subjectIdForDialog!,
        })
      },
    })

  // State Initialization
  useEffect(() => {
    if (testsWithQuestionQuery.data) {
      setEditedTestIds(new Set(testsWithQuestionQuery.data.map((t) => t.id)))
    }
  }, [testsWithQuestionQuery.data])

  // Handlers
  const handleDelete = (questionId: string) => {
    if (window.confirm("Вы уверены, что хотите удалить этот вопрос?")) {
      deleteMutation.mutate({ id: questionId })
    }
  }

  const handleToggleTest = (testId: string) => {
    setEditedTestIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(testId)) {
        newSet.delete(testId)
      } else {
        newSet.add(testId)
      }
      return newSet
    })
  }

  const handleSaveAndClose = () => {
    if (!managingQuestion) return
    updateQuestionInTestsMutation.mutate({
      questionId: managingQuestion.id,
      testIds: Array.from(editedTestIds),
    })
    setManagingQuestion(null)
  }

  const questionCardControls = (question: Question) => (
    <Row className="items-center gap-2">
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setManagingQuestion(question)}
      >
        <SlidersHorizontal className="h-4 w-4" />
      </Button>
      {question.creatorId === session?.user?.id && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleDelete(question.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </Row>
  )

  return (
    <>
      <Head>
        <title>Управление вопросами</title>
      </Head>
      <ProtectedLayout permissionBits={[PermissionBit.TUTOR]}>
        <Container>
          <QuestionsListView
            cardControls={questionCardControls}
            isCreateAllowed={true}
          />
        </Container>
      </ProtectedLayout>

      {managingQuestion && (
        <TestManagementDialog
          isOpen={!!managingQuestion}
          onClose={handleSaveAndClose}
          question={managingQuestion}
          tests={testsQuery.data ?? []}
          checkedTestIds={editedTestIds}
          onToggleTest={handleToggleTest}
          isLoading={testsQuery.isLoading || testsWithQuestionQuery.isLoading}
        />
      )}
    </>
  )
}
