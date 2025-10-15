import { useQueryParam } from "./useQueryParam"

type UseSearchFilterOptions = {
  isQueryParamSyncEnabled?: boolean
  paramName?: string
}

export function useExamPositionFilter({
  isQueryParamSyncEnabled = false,
  paramName = "examPosition",
}: UseSearchFilterOptions = {}) {
  const [value, setValue] = useQueryParam(paramName, {
    isSyncEnabled: isQueryParamSyncEnabled,
  })

  return {
    selectedExamPosition: value ? parseInt(value) : null,
    onSelectedExamPositionChange: (value: number | null) =>
      setValue(value?.toString() ?? null),
  }
}
