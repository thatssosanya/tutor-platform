import { Eye, Trash2 } from "lucide-react"
import Head from "next/head"
import React, { useState } from "react"

import { StudentsView } from "@/components/StudentsView"
import { StudentsViewFilters } from "@/components/StudentsViewFilters"
import ProtectedLayout from "@/layouts/ProtectedLayout"
import { Button, Container, Dialog, Stack } from "@/ui"
import { api } from "@/utils/api"
import { PermissionBit } from "@/utils/permissions"
import { useSubjects } from "@/utils/subjects"

export default function TutorStudentsPage() {
  const { selectedSubjectId, setSelectedSubjectId } = useSubjects()
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
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div className="md:col-span-1">
              <Stack className="gap-4">
                <Stack>
                  <h1 className="text-2xl font-bold">Ученики</h1>
                  <p className="mt-1 text-secondary">
                    Управляйте аккаунтами ваших учеников.
                  </p>
                </Stack>
                <hr className="border-input" />
                <StudentsViewFilters
                  selectedSubjectId={selectedSubjectId}
                  onSelectedSubjectIdChange={setSelectedSubjectId}
                />
              </Stack>
            </div>
            <div className="md:col-span-3">
              <StudentsView
                cardControls={studentCardControls}
                isCreateAllowed={true}
                onCreate={handleStudentCreated}
              />
            </div>
          </div>
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
