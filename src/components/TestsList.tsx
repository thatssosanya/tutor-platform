import React from "react"

import { type RouterOutputs } from "@/utils/api"

import { TestCard } from "./TestCard"
import { Stack } from "@/ui"

type Test = RouterOutputs["test"]["getAllBySubject"][number]

type TestsListProps = {
  tests: Test[]
  isLoading: boolean
  cardControls: (testId: string) => React.ReactNode
}

export function TestsList({ tests, isLoading, cardControls }: TestsListProps) {
  if (isLoading) {
    return <p>Загрузка тестов...</p>
  }

  if (!tests || tests.length === 0) {
    return <p>Тесты по этому предмету не найдены.</p>
  }

  return (
    <Stack className="gap-4">
      {tests.map((test) => (
        <TestCard key={test.id} test={test} controls={cardControls} />
      ))}
    </Stack>
  )
}
