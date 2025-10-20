import { SolutionType } from "@prisma/client"
import React from "react"

import { type RouterOutputs } from "@/utils/api"

import { LongSolutionBlock } from "./LongSolutionBlock"
import { MultiChoiceGroupSolutionBlock } from "./MultiChoiceGroupSolutionBlock"
import { MultiChoiceSolutionBlock } from "./MultiChoiceSolutionBlock"
import { MultiResponseSolutionBlock } from "./MultiResponseSolutionBlock"
import { ShortSolutionBlock } from "./ShortSolutionBlock"

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]

export type QuestionSolutionBlockProps = {
  question: Question
  value?: string | null
  isCorrect?: boolean
  onChange?: (newValue: string) => void
  onBlur?: () => void
}

export function QuestionSolutionBlock(props: QuestionSolutionBlockProps) {
  const { question } = props

  switch (question.solutionType) {
    case SolutionType.SHORT:
      return <ShortSolutionBlock {...props} />
    case SolutionType.MULTICHOICE:
      return <MultiChoiceSolutionBlock {...props} />
    case SolutionType.MULTIRESPONSE:
      return <MultiResponseSolutionBlock {...props} />
    case SolutionType.MULTICHOICEGROUP:
      return <MultiChoiceGroupSolutionBlock {...props} />
    case SolutionType.LONG:
      return <LongSolutionBlock {...props} />
    default:
      return null
  }
}
