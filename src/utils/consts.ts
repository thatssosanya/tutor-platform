import { QuestionMetaType, QuestionSource, SolutionType } from "@prisma/client"

import type { CheckboxOption } from "@/ui"

export const LOCAL_STORAGE_PREFIX = "TutorPlatform."

export const ALL_QUESTION_SOURCES = [
  QuestionSource.FIPI,
  QuestionSource.AI,
  QuestionSource.USER,
]

export const UNENRICHABLE_SOLUTION_TYPES: SolutionType[] = [SolutionType.LONG]

export const SOLUTION_TYPE_OPTIONS: CheckboxOption<SolutionType>[] = [
  { value: SolutionType.SHORT, label: "Краткий" },
  { value: SolutionType.LONG, label: "Развернутый" },
  { value: SolutionType.MULTICHOICE, label: "Выбор" },
  { value: SolutionType.MULTIRESPONSE, label: "Множественный выбор" },
  { value: SolutionType.MULTICHOICEGROUP, label: "Соответствие" },
]

export const REPORT_OPTIONS: CheckboxOption<QuestionMetaType>[] = [
  { value: QuestionMetaType.BODY_REPORT, label: "Ошибка в условии" },
  { value: QuestionMetaType.WORK_REPORT, label: "Ошибка в решении" },
  { value: QuestionMetaType.HINT_REPORT, label: "Ошибка в подсказке" },
]

export const FIPI_EGE_URL = "https://ege.fipi.ru"
export const FIPI_OGE_URL = "https://oge.fipi.ru"

export const EXAM_POSITION_ID_PREFIX = "exp-"
