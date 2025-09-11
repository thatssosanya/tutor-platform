import { QuestionSource } from "@prisma/client"
import React, { useMemo } from "react"

import { ALL_QUESTION_SOURCES } from "@/utils/consts"
import { Listbox, Stack, type ListboxOptionType } from "@/ui"

type SourceFilterProps = {
  selectedSources: QuestionSource[]
  onSelectedSourcesChange: (sources: QuestionSource[]) => void
}

const sourceLabels: Record<QuestionSource, string> = {
  [QuestionSource.FIPI]: "ФИПИ",
  [QuestionSource.AI]: "ИИ",
  [QuestionSource.USER]: "Пользовательские",
}

export function SourceFilter({
  selectedSources,
  onSelectedSourcesChange,
}: SourceFilterProps) {
  const sourceOptions: ListboxOptionType<QuestionSource>[] = useMemo(
    () =>
      ALL_QUESTION_SOURCES.map((source) => ({
        value: source,
        label: sourceLabels[source],
      })),
    []
  )

  const selectedSourceOptions = useMemo(
    () => sourceOptions.filter((o) => selectedSources.includes(o.value)),
    [sourceOptions, selectedSources]
  )

  const handleSourceChange = (
    newSelectedOptions: ListboxOptionType<QuestionSource>[]
  ) => {
    onSelectedSourcesChange(newSelectedOptions.map((option) => option.value))
  }

  return (
    <Stack className="gap-2" as="label">
      <p className="text-sm">Источник</p>
      <Listbox
        multiple
        options={sourceOptions}
        value={selectedSourceOptions}
        onChange={handleSourceChange}
        placeholder="Все источники"
      />
    </Stack>
  )
}
