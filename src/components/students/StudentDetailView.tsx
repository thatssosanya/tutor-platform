import { ArrowLeft, Eye, Save } from "lucide-react"
import React, { useEffect, useState } from "react"

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
import { api } from "@/utils/api"
import { useSubjects } from "@/utils/subjects"

type StudentDetailViewProps = {
  studentId: string
  onBack: () => void
}

export function StudentDetailView({
  studentId,
  onBack,
}: StudentDetailViewProps) {
  const [displayName, setDisplayName] = useState("")
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([])

  const [showCreds, setShowCreds] = useState(false)

  const utils = api.useUtils()
  const { subjects: tutorSubjects } = useSubjects()

  const studentQuery = api.user.getStudent.useQuery(
    { id: studentId },
    { enabled: !!studentId }
  )
  const student = studentQuery.data

  const updateStudentMutation = api.user.updateStudent.useMutation({
    onSuccess: () => {
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
      id: studentId,
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
