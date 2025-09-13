import { SolutionType, type StudentAnswer } from "@prisma/client"
import { Check, X } from "lucide-react"
import Head from "next/head"
import { useRouter } from "next/router"
import React, { useEffect, useMemo, useState } from "react"
import Markdown from "react-markdown"
import rehypeKatex from "rehype-katex"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import "katex/dist/katex.min.css"

import { QuestionList } from "@/components/questions/QuestionList"
import ProtectedLayout from "@/layouts/ProtectedLayout"
import { Button, Collapsible, Container, Input, Row, Stack } from "@/ui"
import { api, type RouterOutputs } from "@/utils/api"
import { PermissionBit } from "@/utils/permissions"

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]

export default function AssignmentPage() {
  const router = useRouter()
  const assignmentId = router.query.assignmentId as string

  const [answers, setAnswers] = useState<Map<string, string>>(new Map())
  const [isEditing, setIsEditing] = useState(true)

  const utils = api.useUtils()
  const assignmentQuery = api.assignment.getById.useQuery(
    { id: assignmentId },
    {
      enabled: !!assignmentId,
      refetchOnWindowFocus: false,
    }
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
      if (assignmentQuery.data.completedAt) {
        setIsEditing(false)
      }
    }
  }, [assignmentQuery.data])

  const questions = useMemo(
    () => assignmentQuery.data?.test.questions.map((tq) => tq.question) ?? [],
    [assignmentQuery.data]
  )

  const studentAnswersMap = useMemo(() => {
    if (!assignmentQuery.data?.answers) {
      return new Map<string, StudentAnswer>()
    }
    return new Map(assignmentQuery.data.answers.map((a) => [a.questionId, a]))
  }, [assignmentQuery.data?.answers])

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

    const currentAnswerText = answers.get(question.id) ?? ""

    if (isEditing && !isCompleted) {
      return (
        <Input
          label="Ответ"
          placeholder="Ваш ответ"
          value={currentAnswerText}
          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
          className="flex-1"
        />
      )
    }

    if (!isEditing || isCompleted) {
      const studentAnswer = studentAnswersMap.get(question.id)
      const isCorrect = studentAnswer?.isCorrect

      return (
        <Stack className="gap-2 text-sm">
          <Row className="items-center">
            {currentAnswerText ? (
              <>
                <span className="font-semibold text-primary">
                  {currentAnswerText}
                </span>
                {isCorrect === true && (
                  <Check className="ml-2 h-4 w-4 text-green-500" />
                )}
                {isCorrect === false && (
                  <X className="ml-2 h-4 w-4 text-red-500" />
                )}
              </>
            ) : (
              <span className="text-secondary">Нет ответа</span>
            )}
            {isCorrect === false && question.solution && (
              <p className="text-secondary ml-4">
                Ответ:{" "}
                <span className="font-semibold text-primary">
                  {question.solution}
                </span>
              </p>
            )}
          </Row>
          {question.work && (
            <Collapsible title="Решение">
              <Markdown
                remarkPlugins={[remarkMath, remarkGfm]}
                rehypePlugins={[rehypeKatex]}
              >
                {question.work}
              </Markdown>
            </Collapsible>
          )}
        </Stack>
      )
    }

    return null
  }

  if (assignmentQuery.isLoading) {
    return (
      <ProtectedLayout>
        <Container>
          <p>Загрузка задания...</p>
        </Container>
      </ProtectedLayout>
    )
  }

  if (!assignmentQuery.data) {
    return (
      <ProtectedLayout>
        <Container>
          <p>Не удалось найти задание.</p>
        </Container>
      </ProtectedLayout>
    )
  }

  return (
    <>
      <Head>
        <title>Задание: {assignmentQuery.data.test.name}</title>
      </Head>
      <ProtectedLayout permissionBits={[PermissionBit.STUDENT]}>
        <Container>
          <Stack className="gap-8">
            <Row className="items-center justify-between">
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

            <QuestionList
              questions={questions}
              isLoading={assignmentQuery.isLoading}
              cardFooter={cardFooter}
            />
          </Stack>
        </Container>
      </ProtectedLayout>
    </>
  )
}
