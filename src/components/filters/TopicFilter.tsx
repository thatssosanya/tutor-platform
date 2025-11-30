import React, { useMemo } from "react"

import { Listbox, type ListboxOptionType, RadioGroup, Stack } from "@/ui"
import { api } from "@/utils/api"
import { EXAM_POSITION_ID_PREFIX } from "@/utils/consts"

type TopicFilterProps = {
  subjectId: string
  selectedTopicIds: string[]
  onSelectedTopicIdsChange: (ids: string[]) => void
  allowedTopicIds?: string[]
  variant?: "examPosition" | "default"
  multiple?: boolean
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
  multiple = true,
}: TopicFilterProps) {
  const topicsQuery = api.topic.getAllBySubject.useQuery({
    subjectId,
    examPosition: variant === "examPosition",
  })

  const { rootTopics, allTopicsMap } = useMemo(() => {
    if (!topicsQuery.data) return { rootTopics: [], allTopicsMap: new Map() }

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

    const map = new Map(topics.map((t) => [t.id, t]))
    const roots = topics.filter((t) => !t.parentId)
    roots.sort(compareTopics)

    return { rootTopics: roots, allTopicsMap: map }
  }, [topicsQuery.data, allowedTopicIds])

  const flattenedOptions = useMemo(() => {
    const options: ListboxOptionType<string>[] = []

    rootTopics.forEach((root) => {
      options.push({
        value: root.id,
        label:
          variant === "examPosition" ? root.name : `${root.id} - ${root.name}`,
        disabled: variant === "examPosition" ? undefined : true,
      })

      const children = Array.from(allTopicsMap.values()).filter(
        (t) => t.parentId === root.id
      )
      children.sort(compareTopics)

      children.forEach((child) => {
        options.push({
          value: child.id,
          label:
            variant === "examPosition"
              ? `  ${child.name}`
              : `  ${child.id} - ${child.name}`,
        })
      })
    })

    return options
  }, [rootTopics, allTopicsMap, variant])

  const selectedOptions = useMemo(
    () =>
      flattenedOptions.filter(
        (option) =>
          option.value !== null && selectedTopicIds.includes(option.value)
      ),
    [flattenedOptions, selectedTopicIds]
  )

  if (variant === "examPosition" && !multiple) {
    if (topicsQuery.isLoading) {
      return (
        <p className="text-sm text-secondary">Загрузка номеров вопроса...</p>
      )
    }

    const selectedRootId =
      rootTopics.find((r) => selectedTopicIds.includes(r.id))?.id ?? null

    const selectedChildId =
      selectedTopicIds.find((id) => {
        const t = allTopicsMap.get(id)
        return t && t.parentId === selectedRootId
      }) ?? null

    const rootOptions: ListboxOptionType<string>[] = rootTopics.map((root) => ({
      value: root.id,
      label: root.name,
    }))

    let childOptions: { value: string; label: string }[] = []
    if (selectedRootId) {
      const children = Array.from(allTopicsMap.values()).filter(
        (t) => t.parentId === selectedRootId
      )
      children.sort((a, b) => a.name.localeCompare(b.name))
      childOptions = children.map((c) => ({
        value: c.id,
        label: c.name,
      }))
    }

    const handleRootChange = (
      option: ListboxOptionType<string> | ListboxOptionType<string>[]
    ) => {
      const val = Array.isArray(option) ? option[0]?.value : option.value
      if (val) {
        onSelectedTopicIdsChange([val])
      } else {
        onSelectedTopicIdsChange([])
      }
    }

    const handleChildChange = (val: string) => {
      if (!selectedRootId) return
      if (!val) {
        onSelectedTopicIdsChange([selectedRootId])
      } else {
        onSelectedTopicIdsChange([selectedRootId, val])
      }
    }

    const selectedRootOption =
      rootOptions.find((o) => o.value === selectedRootId) ?? null

    return (
      <Stack className="gap-2">
        <Listbox
          label="Номер вопроса"
          multiple={false}
          options={rootOptions}
          value={selectedRootOption}
          onChange={handleRootChange}
          placeholder="Выберите номер"
        />
        {selectedRootId && childOptions.length > 0 && (
          <RadioGroup
            options={[{ value: "", label: "Все" }, ...childOptions]}
            value={selectedChildId ?? ""}
            onChange={handleChildChange}
            variant="button"
            className="flex flex-wrap gap-2"
          />
        )}
      </Stack>
    )
  }

  const handleOnChange = (
    newSelectedOptions: ListboxOptionType<string>[] | ListboxOptionType<string>
  ) => {
    if (Array.isArray(newSelectedOptions)) {
      onSelectedTopicIdsChange(
        newSelectedOptions
          .map((option) => option.value)
          .filter((v): v is string => v !== null)
      )
    } else {
      if (newSelectedOptions.value) {
        onSelectedTopicIdsChange([newSelectedOptions.value])
      } else {
        onSelectedTopicIdsChange([])
      }
    }
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

  if (flattenedOptions.length === 0) {
    return (
      <p className="text-sm text-secondary">
        {(variant === "examPosition" ? "Номера вопроса" : "Темы") +
          " не найдены."}
      </p>
    )
  }

  if (multiple) {
    return (
      <Listbox
        label={variant === "examPosition" ? "Номера вопроса" : "Темы"}
        multiple={true}
        options={flattenedOptions}
        value={selectedOptions}
        onChange={handleOnChange}
        placeholder={
          variant === "examPosition" ? "Все номера вопроса" : "Все темы"
        }
        getButtonText={getButtonText}
      />
    )
  }

  return (
    <Listbox
      label={variant === "examPosition" ? "Номер вопроса" : "Тема"}
      multiple={false}
      options={flattenedOptions}
      value={selectedOptions[0] ?? null}
      onChange={handleOnChange}
      placeholder={
        variant === "examPosition" ? "Выберите номер" : "Выберите тему"
      }
    />
  )
}
