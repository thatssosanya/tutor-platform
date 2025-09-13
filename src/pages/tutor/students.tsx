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
import { Transition } from "@headlessui/react"

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
        <Container className="overflow-x-hidden grid">
          <Transition
            show={!activeStudentId}
            as="div"
            className="[grid-area:1/1] transition-transform duration-300 ease-out"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition-transform duration-300 ease-in"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <StudentListView
              cardControls={studentCardControls}
              isCreateAllowed={true}
            />
          </Transition>
          <Transition
            show={!!activeStudentId}
            as="div"
            className="[grid-area:1/1] transition-transform duration-300 ease-out"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="transition-transform duration-300 ease-in"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            {activeStudentId && (
              <StudentDetailView
                studentId={activeStudentId}
                onBack={() => setActiveStudentId(null)}
              />
            )}
          </Transition>
        </Container>
      </ProtectedLayout>
    </>
  )
}
