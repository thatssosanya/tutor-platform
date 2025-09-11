import React, { useMemo } from "react"

import { Listbox, Stack, type ListboxOptionType } from "@/ui"
import { api } from "@/utils/api"

type TopicFilterProps = {
  subjectId: string
  selectedTopicIds: string[]
  onSelectedTopicIdsChange: (ids: string[]) => void
}

export function TopicFilter({
  subjectId,
  selectedTopicIds,
  onSelectedTopicIdsChange,
}: TopicFilterProps) {
  const topicsQuery = api.topic.getAllBySubject.useQuery({ subjectId })

  const topicOptions = useMemo(() => {
    if (!topicsQuery.data) return []

    const topics = topicsQuery.data
    const rootTopics = topics.filter((t) => !t.parentId)
    const childTopicsMap = new Map<string, typeof topics>()

    topics.forEach((topic) => {
      if (topic.parentId) {
        if (!childTopicsMap.has(topic.parentId)) {
          childTopicsMap.set(topic.parentId, [])
        }
        childTopicsMap.get(topic.parentId)!.push(topic)
      }
    })

    rootTopics.sort((a, b) => a.id.localeCompare(b.id))

    const options: ListboxOptionType<string>[] = []
    rootTopics.forEach((root) => {
      options.push({
        value: root.id,
        label: `${root.id} - ${root.name}`,
        disabled: true,
      })

      const children = childTopicsMap.get(root.id)
      if (children) {
        children.sort((a, b) => a.id.localeCompare(b.id))
        children.forEach((child) => {
          options.push({
            value: child.id,
            label: `  ${child.id} - ${child.name}`,
          })
        })
      }
    })

    return options
  }, [topicsQuery.data])

  const selectedOptions = useMemo(
    () =>
      topicOptions.filter((option) => selectedTopicIds.includes(option.value)),
    [topicOptions, selectedTopicIds]
  )

  const handleOnChange = (newSelectedOptions: ListboxOptionType<string>[]) => {
    onSelectedTopicIdsChange(newSelectedOptions.map((option) => option.value))
  }

  const getButtonText = (value: ListboxOptionType<string>[]) => {
    return `Выбрано: ${value.length}`
  }

  if (topicsQuery.isLoading) {
    return <p className="text-sm text-secondary">Загрузка тем...</p>
  }

  if (!topicOptions || topicOptions.length === 0) {
    return <p className="text-sm text-secondary">Темы не найдены.</p>
  }

  return (
    <Stack className="gap-2" as="label">
      <p className="text-sm">Темы</p>
      <Listbox
        multiple
        options={topicOptions}
        value={selectedOptions}
        onChange={handleOnChange}
        placeholder="Все темы"
        getButtonText={getButtonText}
      />
    </Stack>
  )
}
