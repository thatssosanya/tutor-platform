import { ArrowLeft, Check, X } from "lucide-react"
import Head from "next/head"
import React, { useMemo, useState } from "react"

import { QuestionList } from "@/components/questions/QuestionList"
import { Button, Container, Paper, RadioGroup, Spinner, Stack } from "@/ui"
import { api } from "@/utils/api"

import { QuestionSolutionBlock } from "../questions/QuestionSolutionBlock"
import { skipToken } from "@tanstack/react-query"
import { TopicFilter } from "../filters/TopicFilter"
import { Row } from "@/ui/Row"
import { useRouter } from "next/router"
import { SpinnerScreen } from "../SpinnerScreen"

type TutorAssignmentViewProps = {
  assignmentId: string | null
  onBack: () => void
}

type CorrectnessFilter = "all" | "correct" | "incorrect"

const correctnessFilterOptions = [
  { value: "all", label: "Все" },
  { value: "correct", label: "Правильные" },
  { value: "incorrect", label: "Неправильные" },
] as { value: CorrectnessFilter; label: string }[]

export function TutorAssignmentView({
  assignmentId,
  onBack,
}: TutorAssignmentViewProps) {
  const router = useRouter()
  const { from } = router.query

  const [correctnessFilter, setCorrectnessFilter] =
    useState<CorrectnessFilter>("all")
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([])

  const assignmentQuery = api.assignment.getById.useQuery(
    assignmentId ? { id: assignmentId } : skipToken
  )

  const questions = useMemo(
    () => assignmentQuery.data?.test.questions.map((tq) => tq.question) ?? [],
    [assignmentQuery.data]
  )
  const studentAnswersMap = useMemo(
    () =>
      new Map(
        assignmentQuery.data?.answers.map((a) => [a.questionId, a]) ?? []
      ),
    [assignmentQuery.data?.answers]
  )

  const assignmentTopicIds = useMemo(() => {
    const topicIdSet = new Set<string>()
    questions.forEach((q) => {
      q.topics.forEach((t) => topicIdSet.add(t.topicId))
    })
    return Array.from(topicIdSet)
  }, [questions])

  const filteredQuestions = useMemo(() => {
    return questions.filter((question) => {
      // Correctness filter
      if (correctnessFilter !== "all") {
        const answer = studentAnswersMap.get(question.id)
        const isCorrect = answer?.isCorrect ?? null
        if (correctnessFilter === "correct" && isCorrect !== true) {
          return false
        }
        if (correctnessFilter === "incorrect" && isCorrect !== false) {
          return false
        }
      }

      // Topic filter
      if (selectedTopicIds.length > 0) {
        const questionTopicIds = new Set(question.topics.map((t) => t.topicId))
        const hasMatchingTopic = selectedTopicIds.some((id) =>
          questionTopicIds.has(id)
        )
        if (!hasMatchingTopic) {
          return false
        }
      }

      return true
    })
  }, [questions, correctnessFilter, selectedTopicIds, studentAnswersMap])

  if (assignmentQuery.isLoading) {
    return <SpinnerScreen />
  }

  if (!assignmentQuery.data) {
    return (
      <Container>
        <p>Задание не найдено.</p>
      </Container>
    )
  }

  const { test, answers, assignedToId, assignedTo, dueAt, completedAt } =
    assignmentQuery.data

  const handleBack = () => {
    if (from === "test" && assignmentQuery.data?.testId) {
      void router.push(
        `/tutor/tests?subject=${test.subjectId}&testId=${assignmentQuery.data.testId}`
      )
    } else {
      onBack()
    }
  }

  const totalAnswers = answers.length
  const correctAnswersCount = answers.filter((a) => a.isCorrect).length
  const incorrectAnswersCount = totalAnswers - correctAnswersCount
  const correctPercentage =
    totalAnswers > 0 ? (correctAnswersCount / totalAnswers) * 100 : 0
  const incorrectPercentage =
    totalAnswers > 0 ? (incorrectAnswersCount / totalAnswers) * 100 : 0

  return (
    <>
      <Head>
        <title>
          {test.name} - {assignedTo.displayName}
        </title>
      </Head>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_3fr]">
        <Stack className="gap-4">
          <Button
            variant="secondary"
            onClick={handleBack}
            className="self-start"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {from === "test" ? "Назад к тесту" : "Назад к ученику"}
          </Button>
          <Stack>
            <h1 className="text-2xl font-bold">{test.name}</h1>
            <p className="mt-1 text-secondary">
              Результаты ученика:{" "}
              <button className="text-primary cursor-pointer" onClick={onBack}>
                {assignedTo.displayName}
              </button>
            </p>
            <div className="mt-4 gap-x-6 gap-y-4 border-t border-primary pt-4">
              <Stack className="gap-2">
                <Row className="gap-1">
                  <Check className="inline-block h-[1em] w-[1em] text-success" />
                  {correctAnswersCount} ({correctPercentage.toFixed(0)}%)
                  <span className="text-secondary">правильно</span>
                </Row>
                <Row className="gap-1">
                  <X className="inline-block h-[1em] w-[1em] text-danger" />
                  {incorrectAnswersCount} ({incorrectPercentage.toFixed(0)}%)
                  <span className="text-secondary">неправильно</span>
                </Row>
                {dueAt && (
                  <Row className="gap-1">
                    <span className="text-secondary">Срок сдачи: </span>
                    {new Date(dueAt).toLocaleDateString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </Row>
                )}
                {completedAt && (
                  <Row className="gap-1">
                    <span className="text-secondary">Выполнено: </span>
                    {new Date(completedAt).toLocaleString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Row>
                )}
              </Stack>
            </div>
          </Stack>
          <RadioGroup
            label="Статус ответа"
            options={correctnessFilterOptions}
            value={correctnessFilter}
            onChange={setCorrectnessFilter}
            variant="button"
          />
          <TopicFilter
            subjectId={test.subjectId}
            selectedTopicIds={selectedTopicIds}
            onSelectedTopicIdsChange={setSelectedTopicIds}
            allowedTopicIds={assignmentTopicIds}
          />
        </Stack>
        <Stack>
          <QuestionList
            questions={filteredQuestions}
            isLoading={false}
            cardFooter={(question) => {
              const studentAnswer = studentAnswersMap.get(question.id)
              return (
                <QuestionSolutionBlock
                  question={question}
                  studentAnswer={studentAnswer}
                />
              )
            }}
          />
        </Stack>
      </div>
    </>
  )
}
