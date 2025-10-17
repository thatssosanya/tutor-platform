import { useSession } from "next-auth/react"
import { useCallback, useEffect, useMemo } from "react"

import { LOCAL_STORAGE_PREFIX } from "@/utils/consts"

import { useQueryParam } from "./useQueryParam"

const SESSION_STORAGE_KEY = LOCAL_STORAGE_PREFIX + "selectedSubjectId"

type UseSubjectFilterOptions = {
  isStorageSyncEnabled?: boolean
  isQueryParamSyncEnabled?: boolean
  paramName?: string
}

export function useSubjectFilter({
  isStorageSyncEnabled = true,
  isQueryParamSyncEnabled = false,
  paramName = "subject",
}: UseSubjectFilterOptions = {}) {
  const { data: session } = useSession()
  const subjects = useMemo(
    () => session?.user?.subjects ?? [],
    [session?.user?.subjects]
  )

  const [value, setValue] = useQueryParam(paramName, {
    isSyncEnabled: isQueryParamSyncEnabled,
  })

  const handleSetValue = useCallback(
    (id: string) => {
      setValue(id)
      if (isStorageSyncEnabled) {
        sessionStorage.setItem(SESSION_STORAGE_KEY, id)
      }
    },
    [isStorageSyncEnabled, setValue]
  )

  useEffect(() => {
    const subjectIds = new Set(subjects.map((s) => s.id))
    if (value === null) {
      const storedId = sessionStorage.getItem(SESSION_STORAGE_KEY)
      if (storedId && subjectIds.has(storedId)) {
        setValue(storedId)
        return
      }
    }
    if (subjects.length > 0) {
      if (!value || !subjectIds.has(value)) {
        const firstSubjectId = subjects[0]!.id
        handleSetValue(firstSubjectId)
      }
    }
  }, [subjects, value, handleSetValue, setValue])

  return {
    selectedSubjectId: value,
    onSelectedSubjectIdChange: handleSetValue,
    subjects,
  }
}
