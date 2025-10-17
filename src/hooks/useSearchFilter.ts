import { useEffect, useState } from "react"

import { useQueryParam } from "./useQueryParam"

type UseSearchFilterOptions = {
  isQueryParamSyncEnabled?: boolean
  paramName?: string
  delay?: number
}

export function useSearchFilter({
  isQueryParamSyncEnabled = false,
  paramName = "search",
  delay = 500,
}: UseSearchFilterOptions = {}) {
  const [debouncedValue, setDebouncedValue] = useQueryParam(paramName, {
    isSyncEnabled: isQueryParamSyncEnabled,
  })
  const [value, setValue] = useState(debouncedValue)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(timeout)
  }, [value, delay, isQueryParamSyncEnabled, setValue, setDebouncedValue])

  return {
    search: value ?? "",
    onSearchChange: setValue,
    debouncedSearch: debouncedValue ?? "",
  }
}
