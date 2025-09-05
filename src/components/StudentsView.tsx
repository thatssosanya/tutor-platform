import { Plus, X } from "lucide-react"
import React, { useState } from "react"

import { Button, Input, Paper, Row, Stack } from "@/ui"
import { api } from "@/utils/api"

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

  const utils = api.useUtils()
  const studentsQuery = api.user.getStudents.useQuery()
  const createStudentMutation = api.user.createStudent.useMutation({
    onSuccess: async (newStudent) => {
      await utils.user.getStudents.invalidate()
      setIsCreating(false)
      setNewStudentDisplayName("")
      onCreate?.(newStudent.id)
    },
  })

  const handleCancel = () => {
    setIsCreating(false)
    setNewStudentDisplayName("")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStudentDisplayName.trim()) return

    createStudentMutation.mutate({
      displayName: newStudentDisplayName,
    })
  }

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
                <Row className="gap-4">
                  <Input
                    placeholder="Имя ученика"
                    value={newStudentDisplayName}
                    onChange={(e) => setNewStudentDisplayName(e.target.value)}
                    autoFocus
                  />
                  <Button
                    type="submit"
                    disabled={createStudentMutation.isPending}
                  >
                    {createStudentMutation.isPending
                      ? "Создание..."
                      : "Создать"}
                  </Button>
                  <Button variant="danger" type="button" onClick={handleCancel}>
                    <X className="h-4 w-4" />
                  </Button>
                </Row>
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
