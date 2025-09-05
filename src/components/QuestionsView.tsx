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
import { api, type RouterOutputs } from "@/utils/api"

import { QuestionsList } from "./QuestionsList"

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]

type QuestionsViewProps = {
  subjectId: string
  cardControls: (question: Question) => React.ReactNode
  isCreateAllowed?: boolean
}

export function QuestionsView({
  subjectId,
  cardControls,
  isCreateAllowed = false,
}: QuestionsViewProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [body, setBody] = useState("")
  const [work, setWork] = useState("")
  const [solution, setSolution] = useState("")
  const [solutionType, setSolutionType] = useState<SolutionType>(
    SolutionType.SHORT
  )

  const utils = api.useUtils()
  const questionsQuery = api.question.getPaginated.useInfiniteQuery(
    { subjectId, limit: 10 },
    { getNextPageParam: (lastPage) => lastPage.nextCursor }
  )
  const createQuestionMutation = api.question.create.useMutation({
    onSuccess: async () => {
      await utils.question.getPaginated.invalidate({ subjectId })
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
      name: prompt, // Using prompt for name as a default
      prompt,
      body,
      work,
      solution,
      solutionType,
      subjectId,
      topicIds: [], // Topics can be added later
    })
  }

  const solutionTypeOptions: RadioOption<SolutionType>[] = [
    { value: SolutionType.SHORT, label: "Краткий ответ" },
    { value: SolutionType.LONG, label: "Развернутый ответ" },
    // Add other types as needed
  ]

  return (
    <Stack className="gap-4">
      <QuestionsList
        pages={questionsQuery.data?.pages}
        isLoading={questionsQuery.isLoading}
        hasNextPage={questionsQuery.hasNextPage}
        isFetchingNextPage={questionsQuery.isFetchingNextPage}
        fetchNextPage={() => questionsQuery.fetchNextPage()}
        cardControls={cardControls}
      />

      {isCreateAllowed && (
        <div className="mt-2">
          {isCreating ? (
            <Paper>
              <form onSubmit={handleSubmit}>
                <Stack className="gap-4">
                  <Input
                    placeholder="Условие (например, номер из варианта)"
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
                    options={solutionTypeOptions}
                    value={solutionType}
                    onChange={setSolutionType}
                    variant="button"
                  />
                  {solutionType === SolutionType.SHORT && (
                    <Input
                      placeholder="Ответ (для краткого типа)"
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
                    <Button
                      variant="danger"
                      type="button"
                      onClick={handleCancel}
                    >
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
      )}
    </Stack>
  )
}
