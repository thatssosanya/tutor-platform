import React from "react"

import { SubjectFilter } from "./SubjectFilter"

type StudentsViewFiltersProps = {
  selectedSubjectId: string | null
  onSelectedSubjectIdChange: (id: string) => void
}

export function StudentsViewFilters({
  selectedSubjectId,
  onSelectedSubjectIdChange,
}: StudentsViewFiltersProps) {
  return (
    <SubjectFilter
      selectedSubjectId={selectedSubjectId}
      onSelectedSubjectIdChange={onSelectedSubjectIdChange}
    />
  )
}
