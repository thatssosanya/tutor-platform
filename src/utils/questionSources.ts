import { QuestionSource } from "@prisma/client"
import { useEffect, useState } from "react"

import { ALL_QUESTION_SOURCES, LOCAL_STORAGE_PREFIX } from "./consts"

const LOCAL_STORAGE_KEY = LOCAL_STORAGE_PREFIX + "selectedQuestionSources"

export function useQuestionSources() {
  const [selectedSources, setSelectedSources] = useState<QuestionSource[]>([])

  const handleSetSelectedSources = (sources: QuestionSource[]) => {
    setSelectedSources(sources)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sources))
  }

  useEffect(() => {
    const storedSourcesRaw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (storedSourcesRaw) {
      try {
        const storedSources = JSON.parse(storedSourcesRaw) as QuestionSource[]
        if (
          Array.isArray(storedSources) &&
          storedSources.every((s) => ALL_QUESTION_SOURCES.includes(s))
        ) {
          setSelectedSources(storedSources)
        } else {
          localStorage.removeItem(LOCAL_STORAGE_KEY)
          setSelectedSources(ALL_QUESTION_SOURCES)
        }
      } catch (e) {
        console.error(e)
        localStorage.removeItem(LOCAL_STORAGE_KEY)
        setSelectedSources(ALL_QUESTION_SOURCES)
      }
    } else {
      setSelectedSources(ALL_QUESTION_SOURCES)
    }
  }, [])

  return {
    selectedSources,
    setSelectedSources: handleSetSelectedSources,
  }
}
