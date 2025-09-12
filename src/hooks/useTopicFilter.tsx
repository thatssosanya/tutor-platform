import { useEffect, useState } from "react"

export function useTopicFilter(subjectId: string | null) {
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([])

  useEffect(() => {
    setSelectedTopicIds([])
  }, [subjectId])

  return { selectedTopicIds, onSelectedTopicIdsChange: setSelectedTopicIds }
}
