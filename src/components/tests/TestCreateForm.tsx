import { Plus, X } from "lucide-react"
import React, { useState } from "react"

import { Button, Input, Paper, Row } from "@/ui"
import { api } from "@/utils/api"

type TestCreateFormProps = {
  subjectId: string
}

export function TestCreateForm({ subjectId }: TestCreateFormProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newTestName, setNewTestName] = useState("")

  const utils = api.useUtils()
  const createTestMutation = api.test.create.useMutation({
    onSuccess: async () => {
      await utils.test.getAllBySubject.invalidate({ subjectId })
      handleCancel()
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

  if (!isCreating) {
    return (
      <div className="mt-2">
        <Button variant="secondary" onClick={() => setIsCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить тест
        </Button>
      </div>
    )
  }

  return (
    <div className="mt-2">
      <Paper>
        <form onSubmit={handleSubmit}>
          <Row className="gap-4">
            <Input
              placeholder="Название нового теста"
              value={newTestName}
              onChange={(e) => setNewTestName(e.target.value)}
              autoFocus
            />
            <Button type="submit" disabled={createTestMutation.isPending}>
              Создать
            </Button>
            <Button variant="danger" type="button" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
          </Row>
        </form>
      </Paper>
    </div>
  )
}
