import React from "react"

import { type RouterOutputs } from "@/utils/api"

import { TestCard } from "./TestCard"
import { Stack } from "@/ui"
import { SpinnerScreen } from "../SpinnerScreen"

type Test = RouterOutputs["test"]["getAllBySubject"][number] & {
  assignmentId?: string
}

type TestListProps = {
  tests: Test[]
  isLoading: boolean
  cardControls?: (test: Test) => React.ReactNode
  cardFooter?: (test: Test) => React.ReactNode
}

export function TestList({
  tests,
  isLoading,
  cardControls,
  cardFooter,
}: TestListProps) {
  if (isLoading) {
    return <SpinnerScreen />
  }

  if (!tests || tests.length === 0) {
    return <p>Тесты по этому предмету не найдены.</p>
  }

  return (
    <Stack className="gap-4">
      {tests.map((test) => (
        <TestCard
          key={test.id}
          test={test}
          controls={cardControls}
          footer={cardFooter}
        />
      ))}
    </Stack>
  )
}
