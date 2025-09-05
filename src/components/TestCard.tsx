import { FilePen, Trash2, UserPlus } from "lucide-react"
import React from "react"

import { Paper, Row, Stack } from "@/ui"
import { type RouterOutputs } from "@/utils/api"

type Test = RouterOutputs["test"]["getAllBySubject"][number]

type TestCardProps = {
  test: Test
  controls: (testId: string) => React.ReactNode
}

export function TestCard({ test, controls }: TestCardProps) {
  return (
    <Paper data-id={test.id}>
      <Row className="items-center justify-between">
        <Stack>
          <h3 className="font-semibold text-primary">{test.name}</h3>
          <p className="text-sm text-secondary">
            {test._count.questions} вопросов
          </p>
        </Stack>
        <Row className="gap-2">{controls(test.id)}</Row>
      </Row>
    </Paper>
  )
}
