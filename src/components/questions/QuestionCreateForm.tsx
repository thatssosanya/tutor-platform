import { SolutionType } from "@prisma/client"
import { Plus, X } from "lucide-react"
import React, { useState } from "react"

import {
  Button,
  Input,
  Paper,
  RadioGroup,
  type RadioOption,
  Row,
  Stack,
} from "@/ui"
import { api } from "@/utils/api"
import { SOLUTION_TYPE_OPTIONS } from "@/utils/consts"

type QuestionCreateFormProps = {
  subjectId: string
}

export function QuestionCreateForm({ subjectId }: QuestionCreateFormProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [body, setBody] = useState("")
  const [work, setWork] = useState("")
  const [solution, setSolution] = useState("")
  const [solutionType, setSolutionType] = useState<SolutionType>(
    SolutionType.SHORT
  )

  const utils = api.useUtils()
  const createQuestionMutation = api.question.create.useMutation({
    onSuccess: async () => {
      await utils.question.getPaginated.invalidate()
      handleCancel()
    },
  })

  const handleCancel = () => {
    setIsCreating(false)
    setPrompt("")
    setBody("")
    setWork("")
    setSolution("")
    setSolutionType(SolutionType.SHORT)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || !subjectId) return

    createQuestionMutation.mutate({
      name: prompt,
      prompt,
      body,
      work,
      solution,
      solutionType,
      subjectId,
      topicIds: [],
    })
  }

  return (
    <div className="mt-2">
      {isCreating ? (
        <Paper>
          <form onSubmit={handleSubmit}>
            <Stack className="gap-4">
              <Input
                placeholder="Цель"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                autoFocus
              />
              <Input
                placeholder="Текст вопроса"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <Input
                placeholder="Решение"
                value={work}
                onChange={(e) => setWork(e.target.value)}
              />
              <RadioGroup
                options={SOLUTION_TYPE_OPTIONS}
                value={solutionType}
                onChange={setSolutionType}
                variant="button"
              />
              {/* TODO add other types */}
              {solutionType === SolutionType.SHORT && (
                <Input
                  placeholder="Ответ"
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                />
              )}
              <Row className="gap-2">
                <Button
                  type="submit"
                  disabled={createQuestionMutation.isPending}
                >
                  Создать
                </Button>
                <Button variant="danger" type="button" onClick={handleCancel}>
                  <X className="h-4 w-4" />
                </Button>
              </Row>
            </Stack>
          </form>
        </Paper>
      ) : (
        <Button variant="secondary" onClick={() => setIsCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить вопрос
        </Button>
      )}
    </div>
  )
}
