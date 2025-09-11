import React from "react"

import { SubjectFilter } from "../filters/SubjectFilter"

type TestsViewFiltersProps = {
  selectedSubjectId: string | null
  onSelectedSubjectIdChange: (id: string) => void
}

export function TestsViewFilters({
  selectedSubjectId,
  onSelectedSubjectIdChange,
}: TestsViewFiltersProps) {
  return (
    <SubjectFilter
      selectedSubjectId={selectedSubjectId}
      onSelectedSubjectIdChange={onSelectedSubjectIdChange}
    />
  )
}
