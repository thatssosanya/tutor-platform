import React from "react"

import { Stack } from "@/ui"
import { type RouterOutputs } from "@/utils/api"

import { QuestionCard } from "./QuestionCard"

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]

type QuestionsListProps = {
  questions: Question[]
  isLoading: boolean
  cardControls?: (question: Question) => React.ReactNode
  cardFooter?: (question: Question) => React.ReactNode
}

export function QuestionsList({
  questions,
  isLoading,
  cardControls,
  cardFooter,
}: QuestionsListProps) {
  if (isLoading) {
    return <p>Загрузка вопросов...</p>
  }

  if (!questions || questions.length === 0) {
    return <p>Вопросы не найдены.</p>
  }

  return (
    <Stack className="gap-4">
      {questions.map((question: Question) => (
        <QuestionCard
          key={question.id}
          question={question}
          controls={cardControls}
          footer={cardFooter}
        />
      ))}
    </Stack>
  )
}
