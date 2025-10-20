import { SolutionType, type StudentAnswer } from "@prisma/client"
import { Check, Eye, EyeOff, Save, X } from "lucide-react"
import Head from "next/head"
import { useRouter } from "next/router"
import React, { useEffect, useMemo, useState } from "react"

import { Markdown } from "@/components/Markdown"
import { QuestionCard } from "@/components/questions/QuestionCard"
import { QuestionSolutionBlock } from "@/components/questions/QuestionSolutionBlock"
import { SpinnerScreen } from "@/components/SpinnerScreen"
import ProtectedLayout from "@/layouts/ProtectedLayout"
import { cn } from "@/styles"
import { Accordion, Box, Button, Container, Paper, Row, Stack } from "@/ui"
import { api, type RouterOutputs } from "@/utils/api"
import { PermissionBit } from "@/utils/permissions"

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]

// --- New Component for Answer/Solution Block ---
interface AnswerSolutionBlockProps {
  question: Question
  studentAnswer?: StudentAnswer
  currentAnswer: string
  setCurrentAnswer: (value: string) => void
  onSubmit: () => void
  isSubmitting: boolean
}

function AnswerSolutionBlock({
  question,
  studentAnswer,
  currentAnswer,
  setCurrentAnswer,
  onSubmit,
  isSubmitting,
}: AnswerSolutionBlockProps) {
  const [isOpen, setIsOpen] = useState(false)

  const isAnswered = !!studentAnswer
  const canShowHint = !!question.hint && !isAnswered
  const canShowWork = !!question.work && isAnswered

  return (
    <Stack className="w-full gap-4 md:min-h-0">
      <p className="font-semibold">{question.prompt}</p>
      {(canShowHint || canShowWork) && (
        <Accordion
          title={isAnswered ? "Решение" : "Подсказка"}
          className="md:min-h-0"
          panelClassName="md:min-h-0 overflow-y-auto px-0 py-4 text-lg"
          isOpen={isOpen}
          onToggle={() => setIsOpen((prev) => !prev)}
        >
          {!isAnswered ? (
            <Markdown>{question.hint ?? ""}</Markdown>
          ) : (
            <Markdown>{question.work ?? ""}</Markdown>
          )}
        </Accordion>
      )}

      <QuestionSolutionBlock
        question={question}
        value={isAnswered ? studentAnswer.answer : currentAnswer}
        onChange={isAnswered ? undefined : setCurrentAnswer}
        isCorrect={studentAnswer?.isCorrect}
      />

      <Stack className="justify-evenly mt-4 gap-4 md:flex-row">
        <Button
          size="lg"
          className="w-full gap-4"
          onClick={() => setIsOpen((prev) => !prev)}
          disabled={!canShowWork}
        >
          {isOpen && question.work && isAnswered ? <EyeOff /> : <Eye />}
          Решение
        </Button>
        <Button
          size="lg"
          className="w-full gap-4"
          onClick={() => setIsOpen((prev) => !prev)}
          disabled={!canShowHint}
        >
          {isOpen && question.hint && !isAnswered ? <EyeOff /> : <Eye />}
          Подсказка
        </Button>
        <Button
          size="lg"
          className="w-full gap-4"
          onClick={onSubmit}
          disabled={!currentAnswer || isSubmitting || isAnswered}
        >
          <Save />
          Сохранить
        </Button>
      </Stack>
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
    <Stack className="md:min-h-0 h-full overflow-y-auto gap-4">
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
              "grid cursor-pointer grid-cols-[auto_1fr] grid-rows-[auto_auto] gap-x-6 gap-y-2 py-4 border-2 transition-colors",
              borderColor
            )}
          >
            <span
              className={cn(
                "row-span-2 flex items-center justify-center text-4xl pl-2",
                pageColor
              )}
            >
              {pageNum}
            </span>
            <Box className="col-start-2 row-start-1 truncate text-secondary">
              <Markdown>
                {q.body?.split("\n")[0]?.replaceAll("\\dfrac", "\\frac") ??
                  null}
              </Markdown>
            </Box>
            {studentAnswer ? (
              <Row className="col-start-2 row-start-2 items-center gap-2 text-sm">
                <span>{studentAnswer.answer.replaceAll("|", ", ")}</span>
                {isCorrect ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <>
                    <X className="h-4 w-4 text-danger" />
                    {q.solution && (
                      <span className="text-secondary">
                        Ответ: {q.solution.replaceAll("|", ", ")}
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
    (q) => q.solutionType !== SolutionType.LONG
  ).length
  const totalQuestions = questions.length
  const answeredQuestionsCount = studentAnswersMap.size
  const canComplete = answeredQuestionsCount === answerableQuestions

  if (assignmentQuery.isLoading) {
    return <SpinnerScreen />
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

          <Box className={cn("md:row-start-2 md:col-start-1 md:min-h-0")}>
            <QuestionCard
              question={currentQuestion}
              hidePrompt
              hideSolutionBlock
              size="lg"
              footer={() => (
                <AnswerSolutionBlock
                  question={currentQuestion}
                  studentAnswer={currentStudentAnswer}
                  currentAnswer={currentAnswer}
                  setCurrentAnswer={setCurrentAnswer}
                  onSubmit={handleSubmitAnswer}
                  isSubmitting={submitAnswerMutation.isPending}
                />
              )}
            />
          </Box>

          <Box className="md:row-start-2 md:col-start-2 md:h-full md:max-h-full md:min-h-0">
            <CustomPaginationNav
              questions={questions}
              studentAnswersMap={studentAnswersMap}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
            />
          </Box>
        </Container>
      </ProtectedLayout>
    </>
  )
}
