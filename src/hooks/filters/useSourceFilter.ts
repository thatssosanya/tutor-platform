import type { QuestionSource } from "@prisma/client"
import { useCallback, useMemo } from "react"

import { ALL_QUESTION_SOURCES } from "@/utils/consts"

import { useQueryParamArray } from "../useQueryParamArray"

type UseSourceFilterOptions = {
  isQueryParamSyncEnabled?: boolean
  paramName?: string
}

export function useSourceFilter({
  isQueryParamSyncEnabled = false,
  paramName = "sources",
}: UseSourceFilterOptions = {}) {
  const [value, setValue] = useQueryParamArray(paramName, {
    isSyncEnabled: isQueryParamSyncEnabled,
  })

  const filteredValue = useMemo(() => {
    return value.filter((v) =>
      ALL_QUESTION_SOURCES.includes(v as QuestionSource)
    ) as QuestionSource[]
  }, [value])

  const setFilteredValue = useCallback(
    (newValue: QuestionSource[]) => {
      setValue(newValue)
    },
    [setValue]
  )

  return {
    selectedSources: filteredValue,
    onSelectedSourcesChange: setFilteredValue,
  }
}
