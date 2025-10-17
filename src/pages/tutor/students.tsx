import { Transition } from "@headlessui/react"
import { ExternalLink, Trash2 } from "lucide-react"
import Head from "next/head"
import React, { useState } from "react"

import { TutorAssignmentView } from "@/components/assignments/TutorAssignmentView"
import { StudentDetailView } from "@/components/students/StudentDetailView"
import { StudentListView } from "@/components/students/StudentListView"
import { useQueryParam } from "@/hooks/useQueryParam"
import ProtectedLayout from "@/layouts/ProtectedLayout"
import { Button, Container } from "@/ui"
import { api } from "@/utils/api"
import { PermissionBit } from "@/utils/permissions"

export default function TutorStudentsPage() {
  const [activeStudentId, setActiveStudentId] = useQueryParam("studentId")
  const [renderedStudentId, setRenderedStudentId] = useState(activeStudentId)
  const [activeAssignmentId, setActiveAssignmentId] =
    useQueryParam("assignmentId")
  const [renderedAssignmentId, setRenderedAssignmentId] =
    useState(activeAssignmentId)

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
        onClick={() => {
          setActiveStudentId(studentId)
          setRenderedStudentId(studentId)
        }}
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
        <Container className="overflow-x-hidden grid min-h-0">
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
              allowCreate={true}
            />
          </Transition>
          <Transition
            show={!!activeStudentId && !activeAssignmentId}
            as="div"
            className="[grid-area:1/1] transition-transform duration-300 ease-out grid"
            enterFrom={
              !activeAssignmentId && !!renderedAssignmentId
                ? "-translate-x-full"
                : "translate-x-full"
            }
            enterTo="translate-x-0"
            leave="transition-transform duration-300 ease-in"
            leaveFrom="translate-x-0"
            leaveTo={
              !!renderedAssignmentId ? "-translate-x-full" : "translate-x-full"
            }
            afterLeave={() => {
              if (!activeAssignmentId) {
                setRenderedStudentId(null)
              }
            }}
          >
            <StudentDetailView
              studentId={renderedStudentId}
              onBack={() => setActiveStudentId(null)}
              onViewAssignment={(assignmentId) => {
                setActiveAssignmentId(assignmentId)
                setRenderedAssignmentId(assignmentId)
              }}
            />
          </Transition>
          <Transition
            show={!!activeAssignmentId}
            as="div"
            className="[grid-area:1/1] transition-transform duration-300 ease-out"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="transition-transform duration-300 ease-in"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
            afterLeave={() => setRenderedAssignmentId(null)}
          >
            <TutorAssignmentView
              assignmentId={renderedAssignmentId}
              onBack={() => setActiveAssignmentId(null)}
            />
          </Transition>
        </Container>
      </ProtectedLayout>
    </>
  )
}
