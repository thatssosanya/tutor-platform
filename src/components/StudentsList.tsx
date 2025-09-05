import React from "react"

import { Stack } from "@/ui"
import { type RouterOutputs } from "@/utils/api"

import { StudentCard } from "./StudentCard"

type Student = RouterOutputs["user"]["getStudents"][number]

type StudentsListProps = {
  students: Student[]
  isLoading: boolean
  cardControls: (studentId: string) => React.ReactNode
}

export function StudentsList({
  students,
  isLoading,
  cardControls,
}: StudentsListProps) {
  if (isLoading) {
    return <p>Загрузка учеников...</p>
  }

  if (!students || students.length === 0) {
    return <p>Ученики не найдены.</p>
  }

  return (
    <Stack className="gap-4">
      {students.map((student) => (
        <StudentCard
          key={student.id}
          student={student}
          controls={cardControls}
        />
      ))}
    </Stack>
  )
}
