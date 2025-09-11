import React from "react"

import { Paper, Row, Stack } from "@/ui"
import { type RouterOutputs } from "@/utils/api"

type Student = RouterOutputs["user"]["getStudents"][number]

type StudentCardProps = {
  student: Student
  controls: (studentId: string) => React.ReactNode
}

export function StudentCard({ student, controls }: StudentCardProps) {
  return (
    <Paper data-id={student.id}>
      <Row className="items-center justify-between">
        <Stack>
          <h3 className="font-semibold text-primary">{student.displayName}</h3>
          <p className="text-sm text-secondary">{student.name}</p>
        </Stack>
        <Row className="gap-2">{controls(student.id)}</Row>
      </Row>
    </Paper>
  )
}
