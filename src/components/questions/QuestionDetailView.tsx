import { SolutionType } from "@prisma/client"
import { ArrowLeft, Save } from "lucide-react"
import React, { useEffect, useState } from "react"

import {
  Button,
  Input,
  Paper,
  RadioGroup,
  type RadioOption,
  Row,
  Stack,
  Listbox,
  type ListboxOptionType,
} from "@/ui"
import { api } from "@/utils/api"
import { skipToken } from "@tanstack/react-query"
import { SpinnerScreen } from "../SpinnerScreen"
import { SOLUTION_TYPE_OPTIONS } from "@/utils/consts"

type QuestionDetailViewProps = {
  questionId: string
  onBack: () => void
}

export function QuestionDetailView({
  questionId,
  onBack,
}: QuestionDetailViewProps) {
  const [formState, setFormState] = useState({
    name: "",
    prompt: "",
    body: "",
    solution: "",
    solutionPostfix: "",
    work: "",
    solutionType: SolutionType.SHORT as SolutionType,
  })
  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set())

  const utils = api.useUtils()

  // --- Data Queries ---
  const questionQuery = api.question.getById.useQuery({ id: questionId })
  const question = questionQuery.data

  const testsQuery = api.test.getAllBySubject.useQuery(
    { subjectId: question?.subjectId ?? "" },
    { enabled: !!question?.subjectId }
  )

  const testsWithQuestionQuery = api.test.getTestsContainingQuestion.useQuery(
    question
      ? { questionId: question.id, subjectId: question.subjectId }
      : skipToken
  )

  // --- Mutations ---
  const updateQuestionMutation = api.question.update.useMutation({
    onSuccess: () => utils.question.getById.invalidate({ id: questionId }),
  })

  const updateTestsMutation = api.test.updateQuestionInTests.useMutation({
    onSuccess: () =>
      utils.test.getTestsContainingQuestion.invalidate(
        question
          ? { questionId: question.id, subjectId: question.subjectId }
          : undefined
      ),
  })

  // --- Effects to sync state with fetched data ---
  useEffect(() => {
    if (question) {
      setFormState({
        name: question.name,
        prompt: question.prompt,
        body: question.body ?? "",
        solution: question.solution ?? "",
        solutionPostfix: question.solutionPostfix ?? "",
        work: question.work ?? "",
        solutionType: question.solutionType,
      })
    }
  }, [question])

  useEffect(() => {
    if (testsWithQuestionQuery.data) {
      setSelectedTestIds(new Set(testsWithQuestionQuery.data.map((t) => t.id)))
    }
  }, [testsWithQuestionQuery.data])

  // --- Handlers ---
  const handleFormChange = (
    field: keyof typeof formState,
    value: string | SolutionType
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveDetails = () => {
    if (!question) return
    updateQuestionMutation.mutate({
      id: question.id,
      ...formState,
      subjectId: question.subjectId,
      topicIds: question.topics.map((t) => t.topicId),
      source: question.source,
    })
  }

  const handleTestSelectionChange = (
    newSelectedOptions: ListboxOptionType<string>[]
  ) => {
    setSelectedTestIds(
      new Set(
        newSelectedOptions
          .map((option) => option.value)
          .filter((value) => value != null)
      )
    )
  }

  const handleSaveTestsOnBlur = () => {
    if (!question || !testsWithQuestionQuery.data) return

    const initialTestIds = new Set(testsWithQuestionQuery.data.map((t) => t.id))
    const areSetsEqual = (a: Set<string>, b: Set<string>) => {
      if (a.size !== b.size) return false
      for (const item of a) if (!b.has(item)) return false
      return true
    }

    if (areSetsEqual(selectedTestIds, initialTestIds)) {
      return // No changes
    }

    updateTestsMutation.mutate({
      questionId: question.id,
      testIds: Array.from(selectedTestIds),
    })
  }

  // --- Render Logic ---
  if (questionQuery.isLoading) {
    return <SpinnerScreen />
  }
  if (!question) {
    return <p>Вопрос не найден.</p>
  }

  const testOptions: ListboxOptionType<string>[] =
    testsQuery.data?.map((test) => ({
      value: test.id,
      label: test.name,
    })) ?? []

  const selectedTestOptions = testOptions.filter(
    (option) => option.value !== null && selectedTestIds.has(option.value)
  )

  const getTestListboxText = (value: ListboxOptionType<string>[]) => {
    return `Выбрано: ${value.length}`
  }

  return (
    <Stack className="gap-8">
      <Row className="justify-between">
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад к вопросам
        </Button>
      </Row>

      <Paper>
        <Stack className="gap-4">
          <Input
            label="Название"
            placeholder="Название"
            value={formState.name}
            onChange={(e) => handleFormChange("name", e.target.value)}
            variant="primary-paper"
          />
          <Stack as="label" className="gap-2">
            <p className="text-sm font-medium text-secondary">Текст вопроса</p>
            <textarea
              placeholder="Текст вопроса (поддерживает Markdown/LaTeX)"
              value={formState.body}
              onChange={(e) => handleFormChange("body", e.target.value)}
              rows={5}
              className="w-full rounded-md bg-primary px-3 py-2 text-primary placeholder:text-muted shadow-primary shadow-sm inset-shadow-2xs focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </Stack>
          <Input
            label="Цель"
            placeholder="Цель"
            value={formState.prompt}
            onChange={(e) => handleFormChange("prompt", e.target.value)}
            variant="primary-paper"
          />
          <Stack as="label" className="gap-2">
            <p className="text-sm font-medium text-secondary">Решение</p>
            <textarea
              placeholder="Решение (поддерживает Markdown/LaTeX)"
              value={formState.work}
              onChange={(e) => handleFormChange("work", e.target.value)}
              rows={5}
              className="w-full rounded-md bg-primary px-3 py-2 text-primary placeholder:text-muted shadow-primary shadow-sm inset-shadow-2xs focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </Stack>
          <RadioGroup
            label="Тип решения"
            options={SOLUTION_TYPE_OPTIONS}
            value={formState.solutionType}
            onChange={(v) => handleFormChange("solutionType", v)}
            variant="button-paper"
          />
          {/* TODO add other types */}
          {formState.solutionType === SolutionType.SHORT && (
            <>
              <Input
                label="Ответ"
                placeholder="Ответ"
                value={formState.solution}
                onChange={(e) => handleFormChange("solution", e.target.value)}
                variant="primary-paper"
              />
              <Input
                label="Постфикс ответа"
                placeholder="Постфикс ответа (напр. %)"
                value={formState.solutionPostfix}
                onChange={(e) =>
                  handleFormChange("solutionPostfix", e.target.value)
                }
                variant="primary-paper"
              />
            </>
          )}
          {question.attachments.length > 0 && (
            <Stack>
              <h3 className="text-sm font-medium">Вложения</h3>
              <Row className="gap-2">
                {question.attachments.map((a) => (
                  <img
                    key={a.id}
                    src={a.url}
                    alt="attachment"
                    className="h-24 w-auto rounded border border-input"
                  />
                ))}
              </Row>
            </Stack>
          )}
          <Row className="items-center justify-end">
            <Button
              onClick={handleSaveDetails}
              disabled={updateQuestionMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {updateQuestionMutation.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </Row>
        </Stack>
      </Paper>
      <Paper>
        <Stack className="gap-4">
          <label className="text-xl font-semibold">Тесты</label>
          <Listbox
            multiple
            options={testOptions}
            value={selectedTestOptions}
            onChange={handleTestSelectionChange}
            placeholder="Включить вопрос в тесты"
            getButtonText={getTestListboxText}
            onClose={handleSaveTestsOnBlur}
            variant="primary-paper"
          />
        </Stack>
      </Paper>
    </Stack>
  )
}
