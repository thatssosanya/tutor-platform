import React from "react"

import { Stack } from "@/ui"
import { type RouterOutputs } from "@/utils/api"

import { SpinnerScreen } from "../SpinnerScreen"
import { QuestionCard } from "./QuestionCard"

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]

type QuestionListProps = {
  questions: Question[]
  isLoading: boolean
  hideSolutionBlock?: boolean
  cardControls?: (question: Question) => React.ReactNode
  cardFooter?: (question: Question) => React.ReactNode
}

export function QuestionList({
  questions,
  isLoading,
  hideSolutionBlock,
  cardControls,
  cardFooter,
}: QuestionListProps) {
  if (isLoading) {
    return <SpinnerScreen />
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
          hideSolutionBlock={hideSolutionBlock}
          controls={cardControls}
          footer={cardFooter}
        />
      ))}
    </Stack>
  )
}
