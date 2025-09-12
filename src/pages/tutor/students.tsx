import { Eye, Trash2 } from "lucide-react"
import Head from "next/head"
import React, { useState } from "react"

import { StudentsListView } from "@/components/students/StudentsListView"
import ProtectedLayout from "@/layouts/ProtectedLayout"
import { Button, Container, Dialog, Stack } from "@/ui"
import { api } from "@/utils/api"
import { PermissionBit } from "@/utils/permissions"

export default function TutorStudentsPage() {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null
  )

  const selectedStudentQuery = api.user.getStudent.useQuery(
    { id: selectedStudentId! },
    { enabled: !!selectedStudentId }
  )

  const handleView = (studentId: string) => {
    setSelectedStudentId(studentId)
  }

  const handleCloseDialog = () => {
    setSelectedStudentId(null)
  }

  const handleStudentCreated = (studentId: string) => {
    setSelectedStudentId(studentId)
  }

  const studentCardControls = (studentId: string) => (
    <>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => handleView(studentId)}
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          /* TODO: Delete */
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </>
  )

  return (
    <>
      <Head>
        <title>Управление учениками</title>
      </Head>
      <ProtectedLayout permissionBits={[PermissionBit.TUTOR]}>
        <Container>
          <StudentsListView
            cardControls={studentCardControls}
            isCreateAllowed={true}
            onCreate={handleStudentCreated}
          />
        </Container>
      </ProtectedLayout>

      <Dialog
        isOpen={!!selectedStudentId}
        onClose={handleCloseDialog}
        title="Данные для входа ученика"
        className="bg-primary shadow-2xl"
      >
        {selectedStudentQuery.isLoading ? (
          <p>Загрузка данных...</p>
        ) : selectedStudentQuery.data ? (
          <Stack className="mt-4 gap-4">
            <Stack className="gap-1">
              <p className="text-sm font-medium text-secondary">Имя</p>
              <p className="font-mono rounded bg-muted p-2 text-primary">
                {selectedStudentQuery.data.displayName}
              </p>
            </Stack>
            <Stack className="gap-1">
              <p className="text-sm font-medium text-secondary">Логин</p>
              <p className="font-mono rounded bg-muted p-2 text-primary">
                {selectedStudentQuery.data.name}
              </p>
            </Stack>
            <Stack className="gap-1">
              <p className="text-sm font-medium text-secondary">Пароль</p>
              <p className="font-mono rounded bg-muted p-2 text-primary">
                {selectedStudentQuery.data.password}
              </p>
            </Stack>
          </Stack>
        ) : (
          <p>Не удалось загрузить данные ученика.</p>
        )}
      </Dialog>
    </>
  )
}
