import React from "react"

import { Stack } from "@/ui"
import { SubjectFilter } from "../filters/SubjectFilter"
import { TopicFilter } from "../filters/TopicFilter"

type QuestionsViewFiltersProps = {
  selectedSubjectId: string | null
  onSelectedSubjectIdChange: (id: string) => void
  selectedTopicIds: string[]
  onSelectedTopicIdsChange: (ids: string[]) => void
}

export function QuestionsViewFilters({
  selectedSubjectId,
  onSelectedSubjectIdChange,
  selectedTopicIds,
  onSelectedTopicIdsChange,
}: QuestionsViewFiltersProps) {
  return (
    <Stack className="gap-4">
      <SubjectFilter
        selectedSubjectId={selectedSubjectId}
        onSelectedSubjectIdChange={onSelectedSubjectIdChange}
      />
      {selectedSubjectId && (
        <TopicFilter
          subjectId={selectedSubjectId}
          selectedTopicIds={selectedTopicIds}
          onSelectedTopicIdsChange={onSelectedTopicIdsChange}
        />
      )}
    </Stack>
  )
}
