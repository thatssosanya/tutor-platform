import React from "react"

import { Button, Stack } from "@/ui"
import { type RouterOutputs } from "@/utils/api"
import type { InfiniteData } from "@tanstack/react-query"

import { QuestionCard } from "./QuestionCard"

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]

type QuestionsListProps = {
  pages: InfiniteData<any>["pages"] | undefined
  isLoading: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
  cardControls: (question: Question) => React.ReactNode
  cardFooter?: (question: Question) => React.ReactNode
}

export function QuestionsList({
  pages,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  cardControls,
  cardFooter,
}: QuestionsListProps) {
  if (isLoading) {
    return <p>Загрузка вопросов...</p>
  }

  if (!pages || pages.every((page) => page.items.length === 0)) {
    return <p>Вопросы по этому предмету не найдены.</p>
  }

  return (
    <Stack className="gap-4">
      {pages.map((page, i) => (
        <React.Fragment key={i}>
          {page.items.map((question: Question) => (
            <QuestionCard
              key={question.id}
              question={question}
              controls={cardControls}
              footer={cardFooter}
            />
          ))}
        </React.Fragment>
      ))}

      {hasNextPage && (
        <Button
          variant="secondary"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? "Загрузка..." : "Загрузить ещё"}
        </Button>
      )}
    </Stack>
  )
}
