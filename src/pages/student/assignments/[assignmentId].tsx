import { SolutionType } from "@prisma/client"
import { Check, X } from "lucide-react"
import Head from "next/head"
import { useRouter } from "next/router"
import React, { useEffect, useMemo, useState } from "react"

import { QuestionsList } from "@/components/QuestionsList"
import DefaultLayout from "@/layouts/DefaultLayout"
import { Button, Container, Input, Row, Stack } from "@/ui"
import { api, type RouterOutputs } from "@/utils/api"

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]

export default function AssignmentPage() {
  const router = useRouter()
  const assignmentId = router.query.assignmentId as string

  const [answers, setAnswers] = useState<Map<string, string>>(new Map())
  const [isEditing, setIsEditing] = useState(true)

  const utils = api.useUtils()
  const assignmentQuery = api.assignment.getById.useQuery(
    { id: assignmentId },
    { enabled: !!assignmentId }
  )
  const submitMutation = api.assignment.submitAnswers.useMutation({
    onSuccess: async () => {
      await utils.assignment.getById.invalidate({ id: assignmentId })
    },
  })

  useEffect(() => {
    if (assignmentQuery.data) {
      const initialAnswers = new Map(
        assignmentQuery.data.answers.map((a) => [a.questionId, a.answer])
      )
      setAnswers(initialAnswers)
      // If assignment is already completed, lock editing mode.
      if (assignmentQuery.data.completedAt) {
        setIsEditing(false)
      }
    }
  }, [assignmentQuery.data])

  const questions = useMemo(
    () => assignmentQuery.data?.test.questions.map((tq) => tq.question) ?? [],
    [assignmentQuery.data]
  )

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => new Map(prev).set(questionId, answer))
  }

  const handleSubmit = () => {
    submitMutation.mutate({
      assignmentId,
      answers: Array.from(answers.entries()).map(([questionId, answer]) => ({
        questionId,
        answer,
      })),
    })
  }

  const isCompleted = !!assignmentQuery.data?.completedAt

  const cardFooter = (question: Question) => {
    if (question.solutionType !== SolutionType.SHORT) return null

    const currentAnswer = answers.get(question.id) ?? ""

    if (isEditing && !isCompleted) {
      return (
        <Row className="gap-2">
          <Input
            placeholder="Ваш ответ"
            value={currentAnswer}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="flex-1"
          />
        </Row>
      )
    }

    if (!isEditing || isCompleted) {
      const isCorrect =
        question.solution?.trim().toLowerCase() ===
        currentAnswer.trim().toLowerCase()

      return (
        <Row className="gap-2 text-sm items-center">
          {currentAnswer ? (
            <>
              <span className="font-semibold text-primary">
                {currentAnswer}
              </span>
              {isCorrect ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-red-500" />
              )}
            </>
          ) : (
            <span className="text-secondary">Нет ответа</span>
          )}
          {!isCorrect && question.solution && (
            <p className="text-secondary ml-auto">
              Правильный ответ:{" "}
              <span className="font-semibold text-primary">
                {question.solution}
              </span>
            </p>
          )}
        </Row>
      )
    }

    return null
  }

  if (assignmentQuery.isLoading) {
    return (
      <DefaultLayout>
        <p>Загрузка задания...</p>
      </DefaultLayout>
    )
  }

  if (!assignmentQuery.data) {
    return (
      <DefaultLayout>
        <p>Не удалось найти задание.</p>
      </DefaultLayout>
    )
  }

  const pages = [{ items: questions }]

  return (
    <>
      <Head>
        <title>Задание: {assignmentQuery.data.test.name}</title>
      </Head>
      <DefaultLayout>
        <Container>
          <Stack className="gap-8">
            <Row className="justify-between items-center">
              <Stack>
                <h1 className="text-2xl font-bold">
                  {assignmentQuery.data.test.name}
                </h1>
                <p className="mt-1 text-secondary">
                  Введите ответы на вопросы.
                </p>
              </Stack>
              {!isCompleted && isEditing && (
                <Button
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending ? "Отправка..." : "Завершить"}
                </Button>
              )}
              {!isCompleted && !isEditing && (
                <Button onClick={() => setIsEditing(true)}>
                  Редактировать
                </Button>
              )}
              {isCompleted && <Button disabled>Задание выполнено</Button>}
            </Row>

            <QuestionsList
              pages={pages}
              isLoading={false}
              hasNextPage={false}
              isFetchingNextPage={false}
              fetchNextPage={() => {}}
              cardControls={() => null} // No controls needed here
              cardFooter={cardFooter}
            />
          </Stack>
        </Container>
      </DefaultLayout>
    </>
  )
}
