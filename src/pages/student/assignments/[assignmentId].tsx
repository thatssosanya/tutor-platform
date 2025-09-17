import { SolutionType, type StudentAnswer } from "@prisma/client"
import { Check, Eye, EyeOff, X } from "lucide-react"
import Head from "next/head"
import { useRouter } from "next/router"
import React, { useEffect, useMemo, useState } from "react"

import { Markdown } from "@/components/Markdown"
import { QuestionCard } from "@/components/questions/QuestionCard"
import ProtectedLayout from "@/layouts/ProtectedLayout"
import { cn } from "@/styles"
import {
  Box,
  Button,
  Container,
  Input,
  Paper,
  Row,
  Stack,
  Accordion,
} from "@/ui"
import { api, type RouterOutputs } from "@/utils/api"
import { PermissionBit } from "@/utils/permissions"

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

  if (question.solutionType !== SolutionType.SHORT) {
    return null
  }

  if (isCompleted || isAnswered) {
    const isCorrect = studentAnswer?.isCorrect
    return (
      <Stack className="w-full gap-4 grid grid-cols-1 grid-rows-[1fr_auto_auto] md:min-h-0">
        {question.work && (
          <Accordion
            title="Решение"
            className="md:min-h-0"
            panelClassName="md:min-h-0 overflow-y-auto px-0 py-4 text-lg"
            isOpen={isWorkOpen}
            noButton
          >
            <Markdown>{"# Решение\n\n" + question.work}</Markdown>
          </Accordion>
        )}
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
        <Row className="justify-evenly mt-4">
          <Button size="lg" className="gap-4" disabled>
            <Eye />
            Подсказка
          </Button>
          <Button
            size="lg"
            className="gap-4"
            onClick={() => setIsWorkOpen((prev) => !prev)}
          >
            {isWorkOpen ? <EyeOff /> : <Eye />}
            Решение
          </Button>
        </Row>
      </Stack>
    )
  }

  // Otherwise, show the input to submit an answer.
  return (
    <Stack className="w-full justify-center gap-4">
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
      <Row className="justify-evenly mt-4">
        <Button size="lg" className="gap-4" disabled>
          <Eye />
          Подсказка
        </Button>
        <Button size="lg" className="gap-4" disabled>
          <Eye />
          Решение
        </Button>
      </Row>
    </Stack>
  )
}

// --- New Custom Pagination Component ---
interface CustomPaginationNavProps {
  questions: Question[]
  studentAnswersMap: Map<string, StudentAnswer>
  currentPage: number
  setCurrentPage: (page: number) => void
}

function CustomPaginationNav({
  questions,
  studentAnswersMap,
  currentPage,
  setCurrentPage,
}: CustomPaginationNavProps) {
  return (
    <Stack className="md:min-h-0 h-full overflow-y-auto pr-2 gap-4">
      {questions.map((q, index) => {
        const pageNum = index + 1
        const isCurrent = currentPage === pageNum
        const studentAnswer = studentAnswersMap.get(q.id)
        const isCorrect = studentAnswer?.isCorrect

        const borderColor = isCurrent
          ? "border-accent"
          : studentAnswer
            ? isCorrect
              ? "border-success"
              : "border-danger"
            : "border-primary"

        const pageColor = studentAnswer
          ? isCorrect
            ? "text-success"
            : "text-danger"
          : "text-primary"

        return (
          <Paper
            key={q.id}
            onClick={() => setCurrentPage(pageNum)}
            className={cn(
              "grid cursor-pointer grid-cols-[auto_1fr] grid-rows-[auto_auto] gap-x-6 gap-y-2 p-2 border-2 transition-colors",
              borderColor
            )}
          >
            <span
              className={cn(
                "row-span-2 flex items-center justify-center text-4xl",
                pageColor
              )}
            >
              {pageNum}
            </span>
            <p className="col-start-2 row-start-1 truncate text-secondary">
              <Markdown>
                {q.body?.split("\n")[0]?.replaceAll("\\dfrac", "\\frac") ??
                  null}
              </Markdown>
            </p>
            {studentAnswer ? (
              <Row className="col-start-2 row-start-2 items-center gap-2 text-sm">
                <span>{studentAnswer.answer}</span>
                {isCorrect ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <>
                    <X className="h-4 w-4 text-danger" />
                    {q.solution && (
                      <span className="text-secondary">
                        Ответ: {q.solution}
                      </span>
                    )}
                  </>
                )}
              </Row>
            ) : null}
          </Paper>
        )
      })}
    </Stack>
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
        <Container className="flex flex-col md:grid md:grid-cols-[2fr_1fr] md:grid-rows-[auto_1fr] gap-8 pt-24 md:h-screen md:max-h-screen">
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
              "md:row-start-2 md:col-start-1 md:min-h-0",
              currentQuestion.solutionType !== SolutionType.SHORT &&
                "col-span-2"
            )}
          >
            <QuestionCard
              question={currentQuestion}
              isPromptHidden
              size="lg"
              footer={
                currentQuestion.solutionType === SolutionType.SHORT
                  ? () => (
                      <AnswerSolutionBlock
                        question={currentQuestion}
                        studentAnswer={currentStudentAnswer}
                        isCompleted={isCompleted}
                        currentAnswer={currentAnswer}
                        setCurrentAnswer={setCurrentAnswer}
                        onSubmit={handleSubmitAnswer}
                        isSubmitting={submitAnswerMutation.isPending}
                      />
                    )
                  : undefined
              }
            />
          </Box>

          {currentQuestion.solutionType === SolutionType.SHORT && (
            <Box className="md:row-start-2 md:col-start-2 md:h-full md:max-h-full md:min-h-0">
              <CustomPaginationNav
                questions={questions}
                studentAnswersMap={studentAnswersMap}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
              />
            </Box>
          )}
        </Container>
      </ProtectedLayout>
    </>
  )
}
