import { SolutionType, type StudentAnswer } from "@prisma/client"
import { Check, X } from "lucide-react"
import Head from "next/head"
import { useRouter } from "next/router"
import React, { useEffect, useMemo, useState } from "react"

import { QuestionCard } from "@/components/questions/QuestionCard"
import ProtectedLayout from "@/layouts/ProtectedLayout"
import {
  Box,
  Button,
  Collapsible,
  Container,
  Input,
  Pagination,
  Paper,
  Row,
  Stack,
} from "@/ui"
import { api, type RouterOutputs } from "@/utils/api"
import { PermissionBit } from "@/utils/permissions"
import type { VariantProps } from "class-variance-authority"
import type { buttonVariants } from "@/ui/Button"
import { cn } from "@/styles"
import { Markdown } from "@/components/Markdown"

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
  const isAnswered = !!studentAnswer

  if (question.solutionType !== SolutionType.SHORT) {
    return null // Don't render anything for non-short-answer questions
  }

  // If the assignment is done or this specific question is answered, show the result.
  if (isCompleted || isAnswered) {
    const isCorrect = studentAnswer?.isCorrect
    return (
      <Paper className="w-full h-full gap-4 grid grid-cols-1 grid-rows-[auto_1fr_auto]">
        <Stack>
          <p className="font-semibold">{question.prompt}</p>
          <Row className="items-center gap-2">
            <span className="text-primary text-2xl">
              {studentAnswer?.answer ?? "Нет ответа"}
            </span>
            {isCorrect === true ? (
              <Check className="h-8 w-8 text-success" />
            ) : (
              <X className="h-8 w-8 text-danger" />
            )}
            {isCorrect === false && question.solution && (
              <span className="text-secondary text-xl">
                Правильный ответ:{" "}
                <span className="text-primary">{question.solution}</span>
              </span>
            )}
          </Row>
        </Stack>
        {question.work && (
          <Collapsible
            title="Решение"
            className="min-h-0"
            panelClassName="overflow-y-auto max-h-full"
          >
            <Markdown>{question.work}</Markdown>
          </Collapsible>
        )}
      </Paper>
    )
  }

  // Otherwise, show the input to submit an answer.
  return (
    <Paper className="w-full justify-center gap-4">
      <p className="font-semibold">{question.prompt}</p>
      <Input
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
    </Paper>
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
      <ProtectedLayout permissionBits={[PermissionBit.STUDENT]} fullscreen>
        <Container className="flex flex-col md:grid md:grid-cols-[2fr_1fr] md:grid-rows-[auto_1fr_auto] gap-8 pt-24 md:h-screen md:max-h-screen">
          <Box className="md:col-span-2 md:row-start-3">
            <Pagination
              currentPage={currentPage}
              totalPages={totalQuestions}
              onChangePage={setCurrentPage}
              pageVariants={pageVariants}
              variant="all-pages"
            />
          </Box>

          <Stack className="items-center md:row-start-1 md:col-start-1">
            <h1 className="text-2xl font-bold">
              {assignmentQuery.data.test.name}
            </h1>
            <p className="mt-1 text-secondary">
              Вопрос {currentPage} из {totalQuestions}
            </p>
          </Stack>

          <Box className="flex justify-center items-center md:row-start-1 md:col-start-2">
            {!isCompleted && (
              <Button
                onClick={handleCompleteAssignment}
                disabled={!canComplete || completeAssignmentMutation.isPending}
                variant={canComplete ? "success" : "secondary"}
                aria-label="Завершить"
              >
                {completeAssignmentMutation.isPending
                  ? "Завершение..."
                  : "Завершить"}
              </Button>
            )}
            {isCompleted && (
              <Button variant="success" disabled>
                Задание выполнено
              </Button>
            )}
          </Box>

          <Box
            className={cn(
              "md:row-start-2 md:col-start-1 md:overflow-y-auto",
              currentQuestion.solutionType !== SolutionType.SHORT &&
                "col-span-2"
            )}
          >
            <QuestionCard question={currentQuestion} isPromptHidden size="lg" />
          </Box>

          {currentQuestion.solutionType === SolutionType.SHORT && (
            <Box className="md:row-start-2 md:col-start-2 md:h-full md:max-h-full md:min-h-0">
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
          )}
        </Container>
      </ProtectedLayout>
    </>
  )
}
