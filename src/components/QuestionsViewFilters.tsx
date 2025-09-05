import React, { useEffect, useMemo } from "react"

import { RadioGroup, type RadioOption } from "@/ui"
import { api } from "@/utils/api"

type QuestionsViewFiltersProps = {
  selectedSubjectId: string | null
  onSelectedSubjectIdChange: (id: string) => void
}

export function QuestionsViewFilters({
  selectedSubjectId,
  onSelectedSubjectIdChange,
}: QuestionsViewFiltersProps) {
  const subjectsQuery = api.subject.getAll.useQuery()

  const firstSubjectId = useMemo(
    () =>
      (subjectsQuery.data &&
        subjectsQuery.data.length > 0 &&
        subjectsQuery.data[0]!.id) ||
      null,
    [subjectsQuery.data]
  )

  useEffect(() => {
    if (!selectedSubjectId && firstSubjectId) {
      onSelectedSubjectIdChange(firstSubjectId)
    }
  }, [selectedSubjectId, firstSubjectId, onSelectedSubjectIdChange])

  if (subjectsQuery.isLoading) return <p>Загрузка предметов...</p>
  if (!subjectsQuery.data || subjectsQuery.data.length === 0)
    return <p>Предметы не найдены.</p>

  const subjectOptions: RadioOption<string>[] = subjectsQuery.data.map(
    (subject) => ({
      value: subject.id,
      label: subject.name,
    })
  )

  return (
    <RadioGroup<string>
      options={subjectOptions}
      value={selectedSubjectId}
      onChange={onSelectedSubjectIdChange}
      variant="button"
    />
  )
}
