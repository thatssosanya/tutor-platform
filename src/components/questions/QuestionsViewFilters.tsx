import { QuestionSource } from "@prisma/client"
import React from "react"

import { Stack } from "@/ui"
import { SearchFilter } from "../filters/SearchFilter"
import { SourceFilter } from "../filters/SourceFilter"
import { SubjectFilter } from "../filters/SubjectFilter"
import { TopicFilter } from "../filters/TopicFilter"

type QuestionsViewFiltersProps = {
  selectedSubjectId: string | null
  onSelectedSubjectIdChange: (id: string) => void
  selectedTopicIds: string[]
  onSelectedTopicIdsChange: (ids: string[]) => void
  search: string
  onSearchChange: (value: string) => void
  selectedSources: QuestionSource[]
  onSelectedSourcesChange: (sources: QuestionSource[]) => void
}

export function QuestionsViewFilters({
  selectedSubjectId,
  onSelectedSubjectIdChange,
  selectedTopicIds,
  onSelectedTopicIdsChange,
  search,
  onSearchChange,
  selectedSources,
  onSelectedSourcesChange,
}: QuestionsViewFiltersProps) {
  return (
    <Stack className="gap-4">
      <SubjectFilter
        selectedSubjectId={selectedSubjectId}
        onSelectedSubjectIdChange={onSelectedSubjectIdChange}
      />
      <SearchFilter search={search} onSearchChange={onSearchChange} />
      <SourceFilter
        selectedSources={selectedSources}
        onSelectedSourcesChange={onSelectedSourcesChange}
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
