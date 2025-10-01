// src/components/students/StudentDetailView.tsx
import { ArrowLeft, ExternalLink, Eye, Save } from "lucide-react"
import React, { useEffect, useMemo, useState } from "react"

import {
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
import { TestList } from "../tests/TestList"
import { skipToken } from "@tanstack/react-query"

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

  const assignmentCardControls = (test: Test) =>
    onViewAssignment && (
      <Button
        size="sm"
        variant="primary-paper"
        onClick={() => onViewAssignment(test.assignmentId!)}
      >
        <ExternalLink className="h-4 w-4" />
      </Button>
    )

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

  if (studentQuery.isLoading) return <p>Загрузка данных ученика...</p>
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
            <p>Загрузка заданий...</p>
          ) : assignmentsAsTests.length > 0 ? (
            <TestList
              tests={assignmentsAsTests}
              isLoading={assignmentsQuery.isLoading}
              cardControls={assignmentCardControls}
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
