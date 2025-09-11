import React from "react"

import { RadioGroup, Stack, type RadioOption } from "@/ui"
import { useSubjects } from "@/utils/subjects"

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
    <Stack className="gap-2" as="label">
      <p className="text-sm">Предметы</p>
      <RadioGroup<string>
        options={subjectOptions}
        value={selectedSubjectId}
        onChange={onSelectedSubjectIdChange}
        variant="button"
      />
    </Stack>
  )
}
