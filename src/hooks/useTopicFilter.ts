import { useEffect, useRef } from "react"

import { useQueryParamArray } from "./useQueryParamArray"

type UseTopicFilterOptions = {
  isQueryParamSyncEnabled?: boolean
  paramName?: string
}

export function useTopicFilter(
  subjectId: string | null,
  {
    isQueryParamSyncEnabled = false,
    paramName = "topics",
  }: UseTopicFilterOptions = {}
) {
  const [value, setValue] = useQueryParamArray(paramName, {
    isSyncEnabled: isQueryParamSyncEnabled,
  })

  const subjectIdRef = useRef(subjectId)
  useEffect(() => {
    if (subjectIdRef.current === subjectId) {
      return
    }
    subjectIdRef.current = subjectId
    setValue([])
  }, [subjectId, setValue])

  return { selectedTopicIds: value, onSelectedTopicIdsChange: setValue }
}
