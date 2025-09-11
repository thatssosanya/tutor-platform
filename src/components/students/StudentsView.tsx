import { Plus, X } from "lucide-react"
import React, { useState } from "react"

import { Button, CheckboxGroup, Input, Paper, Row, Stack } from "@/ui"
import { api } from "@/utils/api"
import { useSubjects } from "@/utils/subjects"

import { StudentsList } from "./StudentsList"

type StudentsViewProps = {
  cardControls: (studentId: string) => React.ReactNode
  isCreateAllowed?: boolean
  onCreate?: (studentId: string) => void
}

export function StudentsView({
  cardControls,
  isCreateAllowed = false,
  onCreate,
}: StudentsViewProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newStudentDisplayName, setNewStudentDisplayName] = useState("")
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([])
  const { subjects: tutorSubjects } = useSubjects()

  const utils = api.useUtils()
  const studentsQuery = api.user.getStudents.useQuery()
  const createStudentMutation = api.user.createStudent.useMutation({
    onSuccess: async (newStudent) => {
      await utils.user.getStudents.invalidate()
      handleCancel()
      onCreate?.(newStudent.id)
    },
  })

  const handleCancel = () => {
    setIsCreating(false)
    setNewStudentDisplayName("")
    setSelectedSubjectIds([])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStudentDisplayName.trim()) return

    createStudentMutation.mutate({
      displayName: newStudentDisplayName,
      subjectIds: selectedSubjectIds,
    })
  }

  const subjectOptions = tutorSubjects.map((s) => ({
    value: s.id,
    label: s.name,
  }))

  return (
    <Stack className="gap-4">
      <StudentsList
        students={studentsQuery.data ?? []}
        isLoading={studentsQuery.isLoading}
        cardControls={cardControls}
      />

      {isCreateAllowed && (
        <div className="mt-2">
          {isCreating ? (
            <Paper>
              <form onSubmit={handleSubmit}>
                <Stack className="gap-4">
                  <Input
                    placeholder="Имя ученика"
                    value={newStudentDisplayName}
                    onChange={(e) => setNewStudentDisplayName(e.target.value)}
                    autoFocus
                  />
                  <Stack className="gap-1.5">
                    <label className="text-sm font-medium">Предметы</label>
                    <CheckboxGroup
                      options={subjectOptions}
                      value={selectedSubjectIds}
                      onChange={setSelectedSubjectIds}
                      variant="button"
                    />
                  </Stack>
                  <Row className="gap-2">
                    <Button
                      type="submit"
                      disabled={createStudentMutation.isPending}
                    >
                      {createStudentMutation.isPending
                        ? "Создание..."
                        : "Создать"}
                    </Button>
                    <Button
                      variant="danger"
                      type="button"
                      onClick={handleCancel}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </Row>
                </Stack>
              </form>
            </Paper>
          ) : (
            <Button variant="secondary" onClick={() => setIsCreating(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить ученика
            </Button>
          )}
        </div>
      )}
    </Stack>
  )
}
