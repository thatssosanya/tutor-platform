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

import { QuestionCard } from "@/components/questions/QuestionCard"
import ProtectedLayout from "@/layouts/ProtectedLayout"
import {
  Box,
  Button,
  Collapsible,
  Container,
  Input,
  Pagination,
  Row,
  Stack,
} from "@/ui"
import { api, type RouterOutputs } from "@/utils/api"
import { PermissionBit } from "@/utils/permissions"
import type { VariantProps } from "class-variance-authority"
import type { buttonVariants } from "@/ui/Button"

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]

// --- New Component for Answer/Solution Block ---
interface AnswerSolutionBlockProps {
  question: Question
  studentAnswer?: StudentAnswer
  isCompleted: boolean
  currentAnswer: string
  setCurrentAnswer: (value: string) => void
  onSubmit: () => void
  isSubmitting: boolean
}

function AnswerSolutionBlock({
  question,
  studentAnswer,
  isCompleted,
  currentAnswer,
  setCurrentAnswer,
  onSubmit,
  isSubmitting,
}: AnswerSolutionBlockProps) {
  const [isWorkOpen, setIsWorkOpen] = useState(false)
  const isAnswered = !!studentAnswer

  // Base classes for the container
  let containerClasses = "flex h-full w-full"
  // When work is open, align content to the top. Otherwise, center it.
  containerClasses += isWorkOpen ? " items-start" : " items-start"

  if (question.solutionType !== SolutionType.SHORT) {
    return null // Don't render anything for non-short-answer questions
  }

  // If the assignment is done or this specific question is answered, show the result.
  if (isCompleted || isAnswered) {
    const isCorrect = studentAnswer?.isCorrect
    return (
      <Box className="w-full h-full justify-start gap-4 grid grid-cols-1 grid-rows-[auto_1fr_auto]">
        <Row className="items-center gap-2">
          <span className="font-semibold text-primary">
            {studentAnswer?.answer ?? "Нет ответа"}
          </span>
          {isCorrect === true ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <X className="h-4 w-4 text-red-500" />
          )}
          {isCorrect === false && question.solution && (
            <span className="text-secondary">
              Правильный ответ:{" "}
              <span className="font-semibold text-primary">
                {question.solution}
              </span>
            </span>
          )}
        </Row>
        {question.work && (
          <Collapsible
            title="Решение"
            className="min-h-0"
            panelClassName="overflow-y-auto max-h-full"
          >
            <Markdown
              remarkPlugins={[remarkMath, remarkGfm]}
              rehypePlugins={[rehypeKatex]}
            >
              {question.work + question.work}
            </Markdown>
          </Collapsible>
        )}
      </Box>
    )
  }

  // Otherwise, show the input to submit an answer.
  return (
    <div className={containerClasses}>
      <Input
        label="Ответ"
        placeholder="Ваш ответ"
        value={currentAnswer}
        onChange={(e) => setCurrentAnswer(e.target.value)}
        className="w-full"
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit()
        }}
        after={
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? "..." : "Ответить"}
          </Button>
        }
      />
    </div>
  )
}

// --- Main Page Component ---
export default function AssignmentPage() {
  const router = useRouter()
  const assignmentId = router.query.assignmentId as string

  const [currentPage, setCurrentPage] = useState(1)
  const [currentAnswer, setCurrentAnswer] = useState("")

  const utils = api.useUtils()
  const assignmentQuery = api.assignment.getById.useQuery(
    { id: assignmentId },
    { enabled: !!assignmentId, refetchOnWindowFocus: false }
  )

  const submitAnswerMutation = api.assignment.submitSingleAnswer.useMutation({
    onSuccess: (newAnswer) => {
      utils.assignment.getById.setData({ id: assignmentId }, (oldData) => {
        if (!oldData) return
        const existingAnswerIndex = oldData.answers.findIndex(
          (a) => a.questionId === newAnswer.questionId
        )
        const newAnswers = [...oldData.answers]
        if (existingAnswerIndex > -1) {
          newAnswers[existingAnswerIndex] = newAnswer
        } else {
          newAnswers.push(newAnswer)
        }
        return { ...oldData, answers: newAnswers }
      })
    },
  })

  const completeAssignmentMutation =
    api.assignment.completeAssignment.useMutation({
      onSuccess: async () => {
        await utils.assignment.getById.invalidate({ id: assignmentId })
      },
    })

  const questions = useMemo(
    () => assignmentQuery.data?.test.questions.map((tq) => tq.question) ?? [],
    [assignmentQuery.data]
  )

  const studentAnswersMap = useMemo(() => {
    return new Map(assignmentQuery.data?.answers.map((a) => [a.questionId, a]))
  }, [assignmentQuery.data?.answers])

  const currentQuestion = questions[currentPage - 1]
  const currentStudentAnswer = currentQuestion
    ? studentAnswersMap.get(currentQuestion.id)
    : undefined

  useEffect(() => {
    if (currentQuestion) {
      setCurrentAnswer(studentAnswersMap.get(currentQuestion.id)?.answer ?? "")
    }
  }, [currentQuestion, studentAnswersMap])

  const handleSubmitAnswer = () => {
    if (!currentQuestion) return
    submitAnswerMutation.mutate({
      assignmentId,
      questionId: currentQuestion.id,
      answer: currentAnswer,
    })
  }

  const handleCompleteAssignment = () => {
    if (
      window.confirm(
        "Вы уверены, что хотите завершить задание? После этого нельзя будет изменить ответы."
      )
    ) {
      completeAssignmentMutation.mutate({ assignmentId })
    }
  }

  const isCompleted = !!assignmentQuery.data?.completedAt
  const answerableQuestions = questions.filter(
    (q) => q.solutionType === SolutionType.SHORT
  ).length
  const totalQuestions = questions.length
  const answeredQuestionsCount = studentAnswersMap.size
  const canComplete = answeredQuestionsCount === answerableQuestions

  const pageVariants = useMemo(() => {
    const variants: Record<
      number,
      VariantProps<typeof buttonVariants>["variant"]
    > = {}
    questions.forEach((q, index) => {
      const answer = studentAnswersMap.get(q.id)
      if (answer) {
        variants[index + 1] = answer.isCorrect ? "success" : "danger"
      }
    })
    return variants
  }, [questions, studentAnswersMap])

  if (assignmentQuery.isLoading) {
    return (
      <ProtectedLayout>
        <Container>
          <p>Загрузка задания...</p>
        </Container>
      </ProtectedLayout>
    )
  }

  if (!assignmentQuery.data || !currentQuestion) {
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
        <Container className="md:h-screen md:max-h-screen md:overflow-clip md:grid gap-8 md:grid-cols-[auto_2fr_1fr] grid-rows-[auto_1fr] pt-24">
          <Stack className="justify-between items-center md:col-start-2 md:col-span-2">
            <h1 className="text-2xl font-bold">
              {assignmentQuery.data.test.name}
            </h1>
            <p className="mt-1 text-secondary">
              Вопрос {currentPage} из {totalQuestions}
            </p>
          </Stack>

          <Stack className="md:col-start-1 md:row-start-2 gap-4 md:overflow-y-auto md:p-2">
            <Pagination
              currentPage={currentPage}
              totalPages={totalQuestions}
              onChangePage={setCurrentPage}
              pageVariants={pageVariants}
              className="md:flex-col"
              variant="all-pages"
            />
            {!isCompleted && (
              <Button
                onClick={handleCompleteAssignment}
                disabled={!canComplete || completeAssignmentMutation.isPending}
                size="sm"
                className="md:px-0 md:mt-4"
                variant={canComplete ? "success" : "primary"}
                aria-label="Завершить"
              >
                <Box className="md:hidden">
                  {completeAssignmentMutation.isPending
                    ? "Завершение..."
                    : "Завершить"}
                </Box>
                <Check className="hidden md:inline-block h-4 w-4" />
              </Button>
            )}
            {isCompleted && (
              <Button
                variant="success"
                size="sm"
                className="md:px-0 md:mt-4"
                disabled
              >
                <Box className="md:hidden">Задание выполнено</Box>
                <Check className="hidden md:inline-block h-4 w-4" />
              </Button>
            )}
          </Stack>

          <Box className="md:col-start-2 md:row-start-2">
            <QuestionCard
              question={currentQuestion}
              isPromptHidden={isCompleted}
              size="lg"
            />
          </Box>

          <Box className="md:col-start-3 md:row-start-2 md:h-full md:max-h-full md:min-h-0">
            <AnswerSolutionBlock
              question={currentQuestion}
              studentAnswer={currentStudentAnswer}
              isCompleted={isCompleted}
              currentAnswer={currentAnswer}
              setCurrentAnswer={setCurrentAnswer}
              onSubmit={handleSubmitAnswer}
              isSubmitting={submitAnswerMutation.isPending}
            />
          </Box>
        </Container>
      </ProtectedLayout>
    </>
  )
}
