import { useCallback, useMemo } from "react"
import { useQueryParamArray } from "./useQueryParamArray"
import { ALL_QUESTION_SOURCES } from "@/utils/consts"
import type { QuestionSource } from "@prisma/client"

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
