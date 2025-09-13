import { ExternalLink, Trash2 } from "lucide-react"
import Head from "next/head"
import React from "react"

import { StudentDetailView } from "@/components/students/StudentDetailView"
import { StudentListView } from "@/components/students/StudentListView"
import { useQueryParam } from "@/hooks/useQueryParam"
import ProtectedLayout from "@/layouts/ProtectedLayout"
import { Button, Container } from "@/ui"
import { api } from "@/utils/api"
import { PermissionBit } from "@/utils/permissions"

export default function TutorStudentsPage() {
  const [activeStudentId, setActiveStudentId] = useQueryParam("studentId")
  const utils = api.useUtils()

  const deleteStudentMutation = api.user.deleteStudent.useMutation({
    onSuccess: () => {
      utils.user.getStudents.invalidate()
    },
  })

  const handleDelete = (studentId: string) => {
    if (window.confirm("Вы уверены, что хотите удалить этого ученика?")) {
      deleteStudentMutation.mutate({ id: studentId })
    }
  }

  const studentCardControls = (studentId: string) => (
    <>
      <Button
        size="sm"
        variant="primary-paper"
        onClick={() => setActiveStudentId(studentId)}
      >
        <ExternalLink className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="primary-paper"
        onClick={() => handleDelete(studentId)}
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
          {activeStudentId ? (
            <StudentDetailView
              studentId={activeStudentId}
              onBack={() => setActiveStudentId(null)}
            />
          ) : (
            <StudentListView
              cardControls={studentCardControls}
              isCreateAllowed={true}
            />
          )}
        </Container>
      </ProtectedLayout>
    </>
  )
}
