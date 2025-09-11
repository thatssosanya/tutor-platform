import { QuestionSource } from "@prisma/client"

export const LOCAL_STORAGE_PREFIX = "TutorPlatform."

export const ALL_QUESTION_SOURCES = [
  QuestionSource.FIPI,
  QuestionSource.AI,
  QuestionSource.USER,
]
