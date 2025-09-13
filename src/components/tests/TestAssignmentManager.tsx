import { Plus } from "lucide-react"
import React, { useState } from "react"

import { Chip, LabelBox, Row, Stack } from "@/ui"
import { api } from "@/utils/api"
import { formatDateToString } from "@/utils/date"

import { TestAssignDialog } from "./TestAssignDialog"

type TestAssignmentManagerProps = {
  testId: string
}

export function TestAssignmentManager({ testId }: TestAssignmentManagerProps) {
  const [isAssignDialogOpen, setAssignDialogOpen] = useState(false)
  const utils = api.useUtils()

  const assignmentsQuery = api.assignment.getByTestIdWithStudent.useQuery({
    testId,
  })
  const allStudentsQuery = api.user.getStudents.useQuery(undefined, {
    enabled: isAssignDialogOpen,
  })

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
      <LabelBox label="Задано">
        <Row className="flex-wrap gap-2 min-h-10">
          {assignments.map((assignment) => (
            <Chip
              key={assignment.id}
              title={assignment.assignedTo.displayName}
              variant={assignment.completedAt ? "success" : "primary"}
              content={
                assignment.dueAt
                  ? formatDateToString(assignment.dueAt)
                  : undefined
              }
              onDelete={
                !assignment.completedAt
                  ? () => handleDelete(assignment.id)
                  : undefined
              }
            />
          ))}
          <button onClick={() => setAssignDialogOpen(true)}>
            <Chip
              title="Задать"
              className="cursor-pointer hover:bg-muted-highlight"
              content={<Plus className="h-[1em] w-[1em]" />}
            />
          </button>
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
