import { ArrowLeft, Save } from "lucide-react"
import React, { useEffect, useState } from "react"

import { Button, Input, LabelBox, Paper, Row, Stack } from "@/ui"
import { api } from "@/utils/api"

import { TestAssignmentManager } from "./TestAssignmentManager"
import { QuestionPicker } from "../questions/QuestionPicker"

type TestDetailViewProps = {
  testId: string
  onBack: () => void
}

export function TestDetailView({ testId, onBack }: TestDetailViewProps) {
  const [testName, setTestName] = useState("")
  const utils = api.useUtils()

  const testQuery = api.test.getById.useQuery({ id: testId })
  const test = testQuery.data

  const updateTestMutation = api.test.updateName.useMutation({
    onSuccess: async () => {
      await utils.test.getById.invalidate({ id: testId })
      await utils.test.getAllBySubject.invalidate() // To update list view
    },
  })

  const toggleQuestionMutation = api.test.toggleQuestion.useMutation({
    onSuccess: async () => {
      await utils.test.getById.invalidate({ id: testId })
    },
  })

  useEffect(() => {
    if (test) {
      setTestName(test.name)
    }
  }, [test])

  const handleSaveName = () => {
    if (testName.trim() && testName.trim() !== test?.name) {
      updateTestMutation.mutate({ id: testId, name: testName })
    }
  }

  const handleAddQuestion = (questionId: string) => {
    toggleQuestionMutation.mutate({ testId, questionId })
  }

  const handleRemoveQuestion = (questionId: string) => {
    toggleQuestionMutation.mutate({ testId, questionId })
  }

  const isNameChanged = testName !== test?.name

  if (testQuery.isLoading) {
    return <p>Загрузка данных теста...</p>
  }

  if (!test) {
    return <p>Тест не найден.</p>
  }

  const selectedQuestions = test.questions.map((q) => q.question)

  return (
    <Stack className="gap-4">
      <Row className="justify-between">
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад к тестам
        </Button>
        <div />
      </Row>

      <Paper>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <LabelBox label="Название">
            {/* TODO add input after slot*/}
            <Row className="gap-2">
              <Input
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                variant="primary-paper"
              />
              <Button
                onClick={handleSaveName}
                disabled={!isNameChanged || updateTestMutation.isPending}
              >
                <Save className="h-4 w-4" />
              </Button>
            </Row>
          </LabelBox>
          <TestAssignmentManager testId={testId} />
        </div>
      </Paper>

      <QuestionPicker
        subjectId={test.subjectId}
        selectedQuestions={selectedQuestions}
        isLoadingSelected={testQuery.isFetching}
        onAdd={handleAddQuestion}
        onRemove={handleRemoveQuestion}
      />
    </Stack>
  )
}
