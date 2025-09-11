import { Plus, X } from "lucide-react"
import React, { useState } from "react"

import { Button, Input, Paper, Row, Stack } from "@/ui"
import { api } from "@/utils/api"

import { TestsList } from "./TestsList"

type TestsViewProps = {
  subjectId: string
  cardControls: (testId: string) => React.ReactNode
  isCreateAllowed?: boolean
}

export function TestsView({
  subjectId,
  cardControls,
  isCreateAllowed = false,
}: TestsViewProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newTestName, setNewTestName] = useState("")

  const utils = api.useUtils()
  const testsQuery = api.test.getAllBySubject.useQuery({ subjectId })
  const createTestMutation = api.test.create.useMutation({
    onSuccess: async () => {
      await utils.test.getAllBySubject.invalidate({ subjectId })
      setIsCreating(false)
      setNewTestName("")
    },
  })

  const handleCancel = () => {
    setIsCreating(false)
    setNewTestName("")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTestName.trim()) return

    createTestMutation.mutate({
      name: newTestName,
      subjectId: subjectId,
    })
  }

  return (
    <Stack className="gap-4">
      <TestsList
        tests={testsQuery.data ?? []}
        isLoading={testsQuery.isLoading}
        cardControls={cardControls}
      />

      {isCreateAllowed && (
        <div className="mt-2">
          {isCreating ? (
            <Paper>
              <form>
                <Row className="gap-4">
                  <Input
                    placeholder="Название нового теста"
                    value={newTestName}
                    onChange={(e) => setNewTestName(e.target.value)}
                    autoFocus
                  />
                  <Button
                    type="submit"
                    onClick={handleSubmit}
                    disabled={createTestMutation.isPending}
                  >
                    Создать
                  </Button>
                  <Button variant="danger" type="button" onClick={handleCancel}>
                    <X className="h-4 w-4" />
                  </Button>
                </Row>
              </form>
            </Paper>
          ) : (
            <Button variant="secondary" onClick={() => setIsCreating(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить тест
            </Button>
          )}
        </div>
      )}
    </Stack>
  )
}
