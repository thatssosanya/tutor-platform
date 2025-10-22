import React from "react"

import { useSubjects } from "@/hooks/useSubjects"
import { RadioGroup, type RadioOption } from "@/ui"

type SubjectFilterProps = {
  selectedSubjectId: string | null
  onSelectedSubjectIdChange: (id: string) => void
}

export function SubjectFilter({
  selectedSubjectId,
  onSelectedSubjectIdChange,
}: SubjectFilterProps) {
  const { subjects } = useSubjects()

  if (subjects.length <= 1) {
    return null
  }

  const subjectOptions: RadioOption<string>[] = subjects.map((subject) => ({
    value: subject.id,
    label: subject.name,
  }))

  return (
    <RadioGroup<string>
      label="Предметы"
      options={subjectOptions}
      value={selectedSubjectId}
      onChange={onSelectedSubjectIdChange}
      variant="button"
    />
  )
}
