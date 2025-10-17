// src/components/students/StudentDetailView.tsx
import { skipToken } from "@tanstack/react-query"
import {
  ArrowLeft,
  Calendar,
  CalendarCheck,
  Check,
  ExternalLink,
  Eye,
  Save,
  X,
} from "lucide-react"
import React, { useEffect, useMemo, useState } from "react"

import {
  Box,
  Button,
  CheckboxGroup,
  Dialog,
  Input,
  LabelBox,
  Paper,
  Row,
  Stack,
} from "@/ui"
import { api, type RouterOutputs } from "@/utils/api"
import { useSubjects } from "@/utils/subjects"

import { SpinnerScreen } from "../SpinnerScreen"
import { TestList } from "../tests/TestList"

type Test =
  RouterOutputs["assignment"]["getStudentAssignments"][number]["test"] & {
    assignmentId?: string
  }

type StudentDetailViewProps = {
  studentId: string | null
  onBack: () => void
  onViewAssignment?: (assignmentId: string) => void
}

export function StudentDetailView({
  studentId,
  onBack,
  onViewAssignment,
}: StudentDetailViewProps) {
  const [displayName, setDisplayName] = useState("")
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([])

  const [showCreds, setShowCreds] = useState(false)

  const utils = api.useUtils()
  const { subjects: tutorSubjects } = useSubjects()

  const studentQuery = api.user.getStudent.useQuery(
    studentId ? { id: studentId } : skipToken
  )
  const student = studentQuery.data

  const assignmentsQuery = api.assignment.getStudentAssignments.useQuery(
    studentId ? { studentId } : skipToken
  )

  const assignmentsAsTests = useMemo((): Test[] => {
    if (!assignmentsQuery.data) return []
    return assignmentsQuery.data.map(({ test, ...assignment }) => ({
      ...test,
      assignmentId: assignment.id,
    }))
  }, [assignmentsQuery.data])

  const assignmentCardControls = (test: Test) => (
    <>
      {onViewAssignment && test.assignmentId && (
        <Button
          size="sm"
          variant="primary-paper"
          onClick={() => onViewAssignment(test.assignmentId!)}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      )}
    </>
  )

  const assignmentCardFooter = (test: Test) => {
    const assignment = assignmentsQuery.data?.find(
      (a) => a.id === test.assignmentId
    )
    if (!assignment) {
      return null
    }
    const totalAnswers = assignment.answers.length
    const correctAnswersCount = assignment.answers.filter(
      (a) => a.isCorrect
    ).length
    const incorrectAnswersCount = totalAnswers - correctAnswersCount
    const correctPercentage =
      totalAnswers > 0 ? (correctAnswersCount / totalAnswers) * 100 : 0
    const incorrectPercentage =
      totalAnswers > 0 ? (incorrectAnswersCount / totalAnswers) * 100 : 0
    return (
      <Row className="mt-2 gap-2 text-secondary text-sm">
        {assignment.completedAt ? (
          <>
            <CalendarCheck className="h-4 w-4 text-success" />
            <Box>
              Выполнено{" "}
              <span className="text-primary">
                {new Date(assignment.completedAt).toLocaleString("ru-RU", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              :{" "}
            </Box>
            <Row className="gap-1">
              <Check className="inline-block h-[1em] w-[1em] text-success" />
              <span className="text-primary">
                {correctAnswersCount} ({correctPercentage.toFixed(0)}%)
              </span>{" "}
              правильно
            </Row>
            <Row className="gap-1">
              <X className="inline-block h-[1em] w-[1em] text-danger" />
              <span className="text-primary">
                {incorrectAnswersCount} ({incorrectPercentage.toFixed(0)}%)
              </span>
              неправильно
            </Row>
          </>
        ) : (
          assignment.dueAt && (
            <>
              <Calendar className="h-4 w-4 text-primary text-sm" />
              <Box>
                {new Date(assignment.dueAt).toLocaleString("ru-RU", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </Box>
            </>
          )
        )}
      </Row>
    )
  }

  const updateStudentMutation = api.user.updateStudent.useMutation({
    onSuccess: () => {
      if (!studentId) return
      utils.user.getStudent.invalidate({ id: studentId })
      utils.user.getStudents.invalidate()
    },
  })

  useEffect(() => {
    if (student) {
      setDisplayName(student.displayName)
      setSelectedSubjectIds(student.subjects.map((s) => s.id))
    }
  }, [student])

  const handleSaveChanges = (resetPassword = false) => {
    if (!student) return
    updateStudentMutation.mutate({
      id: student.id,
      displayName,
      subjectIds: selectedSubjectIds,
      resetPassword,
    })
  }

  const subjectOptions = tutorSubjects.map((s) => ({
    value: s.id,
    label: s.name,
  }))

  if (studentQuery.isLoading) return <SpinnerScreen />
  if (!student) return <p>Ученик не найден.</p>

  const isBcryptHash = /^\$2[abxy]\$.{56}$/.test(student.password)

  return (
    <>
      <Stack className="gap-8">
        <Row className="justify-between">
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к ученикам
          </Button>
          <Button variant="primary" onClick={() => setShowCreds(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Данные для входа
          </Button>
        </Row>

        <Paper>
          <Stack className="gap-4">
            <Input
              label="Отображаемое имя"
              placeholder="Отображаемое имя"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              variant="primary-paper"
            />

            <CheckboxGroup
              label="Предметы"
              labelAs="div"
              options={subjectOptions}
              value={selectedSubjectIds}
              onChange={setSelectedSubjectIds}
              variant="button-paper"
            />

            <Row className="items-center justify-end">
              <Button
                onClick={() => handleSaveChanges()}
                disabled={updateStudentMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                Сохранить
              </Button>
            </Row>
          </Stack>
        </Paper>

        <Stack className="gap-4">
          <h2 className="text-xl font-semibold">Задания</h2>
          {assignmentsQuery.isLoading ? (
            <SpinnerScreen />
          ) : assignmentsAsTests.length > 0 ? (
            <TestList
              tests={assignmentsAsTests}
              isLoading={assignmentsQuery.isLoading}
              cardControls={assignmentCardControls}
              cardFooter={assignmentCardFooter}
            />
          ) : (
            <p className="text-secondary">У этого ученика нет заданий.</p>
          )}
        </Stack>
      </Stack>
      <Dialog
        title={student.displayName + ": Данные для входа"}
        isOpen={showCreds}
        onClose={() => setShowCreds(false)}
      >
        <Stack className="gap-4">
          <Input label="Логин" value={student.name} onChange={() => {}} />
          <LabelBox label="Пароль">
            {isBcryptHash ? (
              <p className="text-sm text-secondary">
                Пароль был изменен учеником.
              </p>
            ) : (
              <Input value={student.password} onChange={() => {}} />
            )}
          </LabelBox>
          <Row className="justify-start">
            <Button
              variant="danger"
              onClick={() => handleSaveChanges(true)}
              disabled={updateStudentMutation.isPending}
            >
              {updateStudentMutation.isPending &&
              updateStudentMutation.variables?.resetPassword
                ? "Сброс..."
                : "Сбросить пароль"}
            </Button>
          </Row>
        </Stack>
      </Dialog>
    </>
  )
}
