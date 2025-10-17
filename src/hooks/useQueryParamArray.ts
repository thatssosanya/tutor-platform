import { useCallback, useMemo } from "react"

import { useQueryParam } from "./useQueryParam"

type UseQueryParamArrayOptions = {
  isSyncEnabled?: boolean
}

export function useQueryParamArray(
  paramName: string,
  { isSyncEnabled = true }: UseQueryParamArrayOptions = {}
): [value: string[], setValue: (newValue: string[]) => void] {
  const [value, setValue] = useQueryParam(paramName, {
    isSyncEnabled,
  })

  const arrayValue = useMemo(() => (value ? value.split(",") : []), [value])

  const handleSetValue = useCallback(
    (newValue: string[]) => {
      const newRawValue = newValue.length > 0 ? newValue.join(",") : null
      setValue(newRawValue)
    },
    [setValue]
  )

  return [arrayValue, handleSetValue]
}
