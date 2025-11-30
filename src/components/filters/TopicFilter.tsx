import React, { useMemo } from "react"

import { Listbox, type ListboxOptionType } from "@/ui"
import { api } from "@/utils/api"
import { EXAM_POSITION_ID_PREFIX } from "@/utils/consts"

type TopicFilterProps = {
  subjectId: string
  selectedTopicIds: string[]
  onSelectedTopicIdsChange: (ids: string[]) => void
  allowedTopicIds?: string[]
  variant?: "examPosition" | "default"
}

const getSortableParts = (id: string) => {
  const isExp = id.startsWith(EXAM_POSITION_ID_PREFIX)
  let parts: number[]

  if (isExp) {
    parts = id.slice(4).split("-").map(Number)
  } else {
    parts = id.split(".").map(Number)
  }

  return { isExp, parts }
}

const compareTopics = (
  a: { id: string; name: string },
  b: { id: string; name: string }
) => {
  const aData = getSortableParts(a.id)
  const bData = getSortableParts(b.id)

  if (aData.parts.some(isNaN) || bData.parts.some(isNaN)) {
    return a.name.localeCompare(b.name)
  }

  if (aData.isExp !== bData.isExp) {
    return aData.isExp ? 1 : -1
  }

  const maxLen = Math.max(aData.parts.length, bData.parts.length)

  for (let i = 0; i < maxLen; i++) {
    const valA = aData.parts[i]
    const valB = bData.parts[i]

    if (valA === undefined) return -1
    if (valB === undefined) return 1

    if (valA !== valB) {
      return valA - valB
    }
  }

  return 0
}

export function TopicFilter({
  subjectId,
  selectedTopicIds,
  onSelectedTopicIdsChange,
  allowedTopicIds,
  variant = "default",
}: TopicFilterProps) {
  const topicsQuery = api.topic.getAllBySubject.useQuery({
    subjectId,
    examPosition: variant === "examPosition",
  })

  const topicOptions = useMemo(() => {
    if (!topicsQuery.data) return []

    let topics = topicsQuery.data

    if (allowedTopicIds && allowedTopicIds.length > 0) {
      const topicsById = new Map(topics.map((topic) => [topic.id, topic]))
      const visibleTopicIds = new Set<string>()

      for (const topicId of allowedTopicIds) {
        let currentTopic = topicsById.get(topicId)
        while (currentTopic) {
          if (visibleTopicIds.has(currentTopic.id)) break
          visibleTopicIds.add(currentTopic.id)
          currentTopic = currentTopic.parentId
            ? topicsById.get(currentTopic.parentId)
            : undefined
        }
      }
      topics = topics.filter((t) => visibleTopicIds.has(t.id))
    }

    const rootTopics = topics.filter((t) => !t.parentId)

    rootTopics.sort(compareTopics)

    const options: ListboxOptionType<string>[] = []
    rootTopics.forEach((root) => {
      options.push({
        value: root.id,
        label:
          variant === "examPosition" ? root.name : `${root.id} - ${root.name}`,
        disabled: variant === "examPosition" ? undefined : true,
      })

      const children = topics.filter((t) => t.parentId === root.id)

      children.sort(compareTopics)

      if (children) {
        children.forEach((child) => {
          options.push({
            value: child.id,
            label:
              variant === "examPosition"
                ? `  ${child.name}`
                : `  ${child.id} - ${child.name}`,
          })
        })
      }
    })

    return options
  }, [topicsQuery.data, allowedTopicIds, variant])

  const selectedOptions = useMemo(
    () =>
      topicOptions.filter(
        (option) =>
          option.value !== null && selectedTopicIds.includes(option.value)
      ),
    [topicOptions, selectedTopicIds]
  )

  const handleOnChange = (newSelectedOptions: ListboxOptionType<string>[]) => {
    onSelectedTopicIdsChange(
      newSelectedOptions.map((option) => option.value).filter((v) => v !== null)
    )
  }

  const getButtonText = (value: ListboxOptionType<string>[]) => {
    return `Выбрано: ${value.length}`
  }

  if (topicsQuery.isLoading) {
    return (
      <p className="text-sm text-secondary">
        Загрузка {variant === "examPosition" ? "номеров вопроса" : "тем"}...
      </p>
    )
  }

  if (!topicOptions || topicOptions.length === 0) {
    return (
      <p className="text-sm text-secondary">
        {(variant === "examPosition" ? "Номера вопроса" : "Темы") +
          " не найдены."}
      </p>
    )
  }

  return (
    <Listbox
      label={variant === "examPosition" ? "Номера вопроса" : "Темы"}
      multiple
      options={topicOptions}
      value={selectedOptions}
      onChange={handleOnChange}
      placeholder={
        variant === "examPosition" ? "Все номера вопроса" : "Все темы"
      }
      getButtonText={getButtonText}
    />
  )
}
