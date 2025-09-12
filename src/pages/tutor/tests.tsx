import { FilePen, Trash2, UserPlus } from "lucide-react"
import Head from "next/head"
import React, { useEffect, useState } from "react"

import { StudentsList } from "@/components/students/StudentsList"
import { TestQuestionManager } from "@/components/tests/TestQuestionManager"
import { TestsListView } from "@/components/tests/TestsListView"
import ProtectedLayout from "@/layouts/ProtectedLayout"
import {
  Box,
  Button,
  Checkbox,
  Container,
  DatePicker,
  Dialog,
  Row,
  Stack,
} from "@/ui"
import { api } from "@/utils/api"
import { formatDateToString } from "@/utils/date"
import { PermissionBit } from "@/utils/permissions"

export default function TutorTestsPage() {
  const [isAssignDialogOpen, setAssignDialogOpen] = useState(false)
  const [isQuestionsDialogOpen, setQuestionsDialogOpen] = useState(false)
  const [activeTestId, setActiveTestId] = useState<string | null>(null)
  const [editedQuestionIds, setEditedQuestionIds] = useState<Set<string>>(
    new Set()
  )
  const [studentAssignments, setStudentAssignments] = useState<
    Map<string, string>
  >(new Map())

  const utils = api.useUtils()

  // Queries
  const activeTestQuery = api.test.getById.useQuery(
    { id: activeTestId! },
    { enabled: !!activeTestId }
  )
  const studentsQuery = api.user.getStudents.useQuery(undefined, {
    enabled: isAssignDialogOpen,
  })
  const assignmentsQuery = api.assignment.getByTestId.useQuery(
    { testId: activeTestId! },
    { enabled: !!activeTestId && isAssignDialogOpen }
  )

  // Effects
  useEffect(() => {
    if (activeTestQuery.data) {
      setEditedQuestionIds(
        new Set(activeTestQuery.data.questions.map((q) => q.questionId))
      )
    }
  }, [activeTestQuery.data])

  useEffect(() => {
    if (assignmentsQuery.data) {
      const newMap = new Map<string, string>()
      assignmentsQuery.data.forEach((assignment) => {
        newMap.set(
          assignment.assignedToId,
          assignment.dueAt ? formatDateToString(assignment.dueAt) : ""
        )
      })
      setStudentAssignments(newMap)
    }
  }, [assignmentsQuery.data])

  // Mutations
  const deleteTestMutation = api.test.delete.useMutation({
    onSuccess: () => utils.test.getAllBySubject.invalidate(),
  })
  const updateQuestionsMutation = api.test.updateQuestions.useMutation({
    onSuccess: () => {
      utils.test.getById.invalidate({ id: activeTestId! })
      utils.test.getAllBySubject.invalidate()
    },
  })
  const updateAssignmentsMutation =
    api.assignment.updateAssignmentsForTest.useMutation({
      onSuccess: () => {
        utils.assignment.getByTestId.invalidate({ testId: activeTestId! })
      },
    })

  // Handlers
  const openDialog = (
    dialogSetter: React.Dispatch<React.SetStateAction<boolean>>,
    testId: string
  ) => {
    setActiveTestId(testId)
    dialogSetter(true)
  }

  const handleDelete = (testId: string) => {
    if (window.confirm("Вы уверены, что хотите удалить этот тест?")) {
      deleteTestMutation.mutate({ id: testId })
    }
  }

  const handleToggleQuestion = (questionId: string) => {
    setEditedQuestionIds((prev) => {
      const newIds = new Set(prev)
      if (newIds.has(questionId)) {
        newIds.delete(questionId)
      } else {
        newIds.add(questionId)
      }
      return newIds
    })
  }

  const handleSaveQuestions = () => {
    if (!activeTestId) return
    updateQuestionsMutation.mutate({
      testId: activeTestId,
      questionIds: Array.from(editedQuestionIds),
    })
    setQuestionsDialogOpen(false)
  }

  const handleToggleStudent = (studentId: string) => {
    setStudentAssignments((prev) => {
      const newMap = new Map(prev)
      if (newMap.has(studentId)) {
        newMap.delete(studentId)
      } else {
        newMap.set(studentId, "") // Add with no due date initially
      }
      return newMap
    })
  }

  const handleDateChange = (studentId: string, date: string) => {
    setStudentAssignments((prev) => new Map(prev).set(studentId, date))
  }

  const handleSaveAssignments = () => {
    if (!activeTestId) return
    updateAssignmentsMutation.mutate({
      testId: activeTestId,
      assignments: Array.from(studentAssignments.entries()).map(
        ([studentId, dueDate]) => ({
          studentId,
          dueDate,
        })
      ),
    })
    setAssignDialogOpen(false)
  }

  // Render Props
  const testCardControls = (testId: string) => (
    <>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => openDialog(setAssignDialogOpen, testId)}
      >
        <UserPlus className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => openDialog(setQuestionsDialogOpen, testId)}
      >
        <FilePen className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => handleDelete(testId)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </>
  )

  const studentCardControls = (studentId: string) => {
    const isAssigned = studentAssignments.has(studentId)
    return (
      <Row className="items-center gap-4">
        {isAssigned && (
          <Row className="gap-2">
            <Box>До</Box>
            <DatePicker
              value={studentAssignments.get(studentId) ?? ""}
              onChange={(date) => handleDateChange(studentId, date)}
              className="w-28"
            />
          </Row>
        )}
        <Checkbox
          checked={isAssigned}
          onChange={() => handleToggleStudent(studentId)}
        />
      </Row>
    )
  }

  return (
    <>
      <Head>
        <title>Управление тестами</title>
      </Head>
      <ProtectedLayout permissionBits={[PermissionBit.TUTOR]}>
        <Container>
          <TestsListView
            cardControls={testCardControls}
            isCreateAllowed={true}
          />
        </Container>
      </ProtectedLayout>

      <Dialog
        isOpen={isAssignDialogOpen}
        onClose={handleSaveAssignments}
        title="Назначить тест"
        className="bg-primary shadow-2xl md:container min-h-50"
      >
        <Stack className="mt-4 gap-2">
          {studentsQuery.isLoading || assignmentsQuery.isLoading ? (
            <p>Загрузка учеников...</p>
          ) : studentsQuery.data?.length === 0 ? (
            <p>У вас еще нет учеников. Создайте их на странице учеников.</p>
          ) : (
            <StudentsList
              students={studentsQuery.data ?? []}
              isLoading={studentsQuery.isLoading || assignmentsQuery.isLoading}
              cardControls={studentCardControls}
            />
          )}
        </Stack>
      </Dialog>

      <Dialog
        isOpen={isQuestionsDialogOpen}
        onClose={handleSaveQuestions}
        title="Выберите вопросы"
        className="bg-primary shadow-2xl md:container min-h-50"
      >
        {activeTestQuery.data ? (
          <Stack className="mt-4 gap-2">
            <h4 className="font-semibold text-primary">Добавить в тест</h4>
            <TestQuestionManager
              subjectId={activeTestQuery.data.subjectId}
              checkedQuestionIds={editedQuestionIds}
              onToggleQuestion={handleToggleQuestion}
            />
          </Stack>
        ) : (
          <p>Загрузка данных теста...</p>
        )}
      </Dialog>
    </>
  )
}
