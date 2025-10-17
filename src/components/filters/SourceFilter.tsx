import { QuestionSource } from "@prisma/client"
import React, { useMemo } from "react"

import { Listbox, type ListboxOptionType } from "@/ui"
import { ALL_QUESTION_SOURCES } from "@/utils/consts"

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
    () =>
      sourceOptions.filter(
        (o) => o.value !== null && selectedSources.includes(o.value)
      ),
    [sourceOptions, selectedSources]
  )

  const handleSourceChange = (
    newSelectedOptions: ListboxOptionType<QuestionSource>[]
  ) => {
    onSelectedSourcesChange(
      newSelectedOptions.map((option) => option.value).filter((v) => v !== null)
    )
  }

  return (
    <Listbox
      label="Источник"
      multiple
      options={sourceOptions}
      value={selectedSourceOptions}
      onChange={handleSourceChange}
      placeholder="Все источники"
    />
  )
}
