import { Plus, X } from "lucide-react"
import React, { useState } from "react"

import { Chip, LabelBox, Row, Stack } from "@/ui"
import { api } from "@/utils/api"
import { formatDateToString } from "@/utils/date"

import { TestAssignDialog } from "./TestAssignDialog"
import { useRouter } from "next/router"

type TestAssignmentManagerProps = {
  subjectId: string
  testId: string
}

export function TestAssignmentManager({
  subjectId,
  testId,
}: TestAssignmentManagerProps) {
  const router = useRouter()
  const [isAssignDialogOpen, setAssignDialogOpen] = useState(false)
  const utils = api.useUtils()

  const assignmentsQuery = api.assignment.getByTestIdWithStudent.useQuery({
    testId,
  })
  const allStudentsQuery = api.user.getStudents.useQuery(
    { subjectId },
    {
      enabled: isAssignDialogOpen,
    }
  )

  const deleteAssignmentMutation = api.assignment.delete.useMutation({
    onSuccess: async () => {
      await utils.assignment.getByTestIdWithStudent.invalidate({ testId })
    },
  })

  const handleDelete = (assignmentId: string) => {
    if (window.confirm("Вы уверены, что хотите отменить это задание?")) {
      deleteAssignmentMutation.mutate({ id: assignmentId })
    }
  }

  if (assignmentsQuery.isLoading) {
    return (
      <Stack className="gap-2">
        <p className="text-sm font-medium">Задано</p>
        <p className="text-sm text-secondary">Загрузка учеников...</p>
      </Stack>
    )
  }

  const assignments = assignmentsQuery.data ?? []

  return (
    <>
      <LabelBox label="Задано" labelAs="div">
        <Row className="flex-wrap gap-2 min-h-10">
          {assignments.map((assignment) => (
            <Chip
              key={assignment.id}
              title={assignment.assignedTo.displayName}
              variant={assignment.completedAt ? "success" : "primary"}
              content={
                assignment.dueAt ? (
                  <>
                    {formatDateToString(assignment.dueAt)}
                    <button
                      onClick={() => handleDelete(assignment.id)}
                      className="-mr-1.5 rounded-full p-0.5 hover:bg-black/10 cursor-pointer"
                      aria-label="Удалить"
                    >
                      <X className="h-[1em] w-[1em]" />
                    </button>
                  </>
                ) : undefined
              }
              as="a"
              onClick={() => {
                router.push(
                  `/tutor/students?subjectId=${subjectId}&studentId=${assignment.assignedToId}&assignmentId=${assignment.id}&from=test`
                )
              }}
            />
          ))}
          <Chip
            title="Задать"
            className="cursor-pointer hover:bg-muted-highlight"
            content={<Plus className="h-[1em] w-[1em]" />}
            onClick={() => setAssignDialogOpen(true)}
          />
        </Row>
      </LabelBox>

      <TestAssignDialog
        isOpen={isAssignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        testId={testId}
        allStudents={allStudentsQuery.data ?? []}
      />
    </>
  )
}
