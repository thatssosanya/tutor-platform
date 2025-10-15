import React, { useMemo } from "react"

import { Listbox, type ListboxOptionType } from "@/ui"

const EXAM_POSITIONS = Array.from({ length: 25 }, (_, i) => i + 1)

type ExamPositionFilterProps = {
  selectedPosition: number | null
  onSelectedPositionChange: (position: number | null) => void
}

export function ExamPositionFilter({
  selectedPosition,
  onSelectedPositionChange,
}: ExamPositionFilterProps) {
  const positionOptions: ListboxOptionType<number>[] = useMemo(
    () => [
      { value: null, label: "Все задания" },
      ...EXAM_POSITIONS.map((pos) => ({
        value: pos,
        label: String(pos),
      })),
    ],
    []
  )

  const selectedPositionOptions = useMemo(() => {
    const foundOption = positionOptions.find(
      (o) => o.value === selectedPosition
    )
    return foundOption ? foundOption : null
  }, [positionOptions, selectedPosition])

  const handlePositionChange = (
    newSelectedOption: ListboxOptionType<number>
  ) => {
    const newPosition = newSelectedOption?.value ?? null
    onSelectedPositionChange(newPosition)
  }

  return (
    <Listbox
      label="Номер задания"
      multiple={false}
      options={positionOptions}
      value={selectedPositionOptions}
      onChange={handlePositionChange}
      placeholder="Все задания"
    />
  )
}
