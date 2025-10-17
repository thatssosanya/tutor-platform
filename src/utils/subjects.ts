import { useSession } from "next-auth/react"
import { useEffect, useMemo, useState } from "react"

import { LOCAL_STORAGE_PREFIX } from "./consts"

const LOCAL_STORAGE_KEY = LOCAL_STORAGE_PREFIX + "selectedSubjectId"

export function useSubjects() {
  const { data: session } = useSession()
  const subjects = useMemo(
    () => session?.user?.subjects ?? [],
    [session?.user?.subjects]
  )

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
    null
  )

  const handleSetSelectedSubjectId = (id: string) => {
    setSelectedSubjectId(id)
    localStorage.setItem(LOCAL_STORAGE_KEY, id)
  }

  useEffect(() => {
    if (selectedSubjectId === null) {
      const storedId = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (storedId) {
        setSelectedSubjectId(storedId)
        return
      }
    }
    if (subjects.length > 0) {
      const subjectIds = new Set(subjects.map((s) => s.id))
      if (!selectedSubjectId || !subjectIds.has(selectedSubjectId)) {
        const firstSubjectId = subjects[0]!.id
        handleSetSelectedSubjectId(firstSubjectId)
      }
    }
  }, [subjects, selectedSubjectId])

  return {
    subjects,
    selectedSubjectId,
    setSelectedSubjectId: handleSetSelectedSubjectId,
  }
}
