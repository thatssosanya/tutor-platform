import {
  QuestionMetaSource,
  QuestionMetaType,
  QuestionSource,
  SolutionType,
} from "@prisma/client"
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
} from "lucide-react"
import type { NextPage } from "next"
import { useRouter } from "next/router"
import { useSession } from "next-auth/react"
import React, { useCallback, useEffect, useMemo, useState } from "react"

import { SearchFilter } from "@/components/filters/SearchFilter"
import { TopicFilter } from "@/components/filters/TopicFilter"
import { Markdown } from "@/components/Markdown"
import { QuestionCard } from "@/components/questions/QuestionCard"
import { QuestionSolutionBlock } from "@/components/questions/QuestionSolutionBlock"
import { SpinnerScreen } from "@/components/SpinnerScreen"
import { useSearchFilter } from "@/hooks/filters/useSearchFilter"
import { useTopicFilter } from "@/hooks/filters/useTopicFilter"
import DefaultLayout from "@/layouts/DefaultLayout"
import { cn } from "@/styles"
import {
  Box,
  Button,
  Checkbox,
  Container,
  Listbox,
  type ListboxOptionType,
  RadioGroup,
  type RadioOption,
  Row,
  Stack,
} from "@/ui"
import { api, type RouterInputs, type RouterOutputs } from "@/utils/api"
import {
  SOLUTION_TYPE_OPTIONS,
  UNENRICHABLE_SOLUTION_TYPES,
} from "@/utils/consts"

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]
type BooleanFilterState = "all" | "yes" | "no"

function PaginationControl({
  page,
  setPage,
  totalPages,
  disabled,
}: {
  page: number
  setPage: React.Dispatch<React.SetStateAction<number>>
  totalPages: number | undefined
  disabled: boolean
}) {
  const [internalPage, setInternalPage] = useState(page.toString())

  useEffect(() => {
    setInternalPage(page.toString())
  }, [page])

  const commitChange = () => {
    const val = parseInt(internalPage)

    if (isNaN(val)) {
      setInternalPage(page.toString())
      return
    }

    const clampedVal = Math.min(Math.max(1, val), totalPages ?? 1)

    setInternalPage(clampedVal.toString())

    if (clampedVal !== page) {
      setPage(clampedVal)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur()
    }
  }

  if (!totalPages || totalPages <= 1) return null

  return (
    <Row className="justify-center gap-2">
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setPage(1)}
        disabled={page <= 1 || disabled}
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        disabled={page <= 1 || disabled}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Row className="gap-2">
        <span className="text-sm font-medium">Страница:</span>
        <input
          type="number"
          min={1}
          max={totalPages}
          value={internalPage}
          onChange={(e) => setInternalPage(e.target.value)}
          onBlur={commitChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="w-16 rounded-md border border-input bg-input px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <span className="text-sm font-medium text-secondary">
          из {totalPages}
        </span>
      </Row>

      <Button
        size="sm"
        variant="secondary"
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        disabled={page >= totalPages || disabled}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setPage(totalPages)}
        disabled={page >= totalPages || disabled}
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </Row>
  )
}
const MemoizedPaginationControl = React.memo(PaginationControl)

// --- Helper Filter Components ---

const REPORT_OPTIONS: ListboxOptionType<QuestionMetaType>[] = [
  { value: QuestionMetaType.BODY_REPORT, label: "Ошибка в условии" },
  { value: QuestionMetaType.WORK_REPORT, label: "Ошибка в решении" },
  { value: QuestionMetaType.HINT_REPORT, label: "Ошибка в подсказке" },
]
const REPORT_BUTTON_DATA: ListboxOptionType<QuestionMetaType>[] = [
  { value: QuestionMetaType.BODY_REPORT, label: "Условие" },
  { value: QuestionMetaType.WORK_REPORT, label: "Решение" },
  { value: QuestionMetaType.HINT_REPORT, label: "Подсказка" },
]

const BooleanFilterGroup: React.FC<{
  label: string
  value: BooleanFilterState
  onChange: (value: BooleanFilterState) => void
  yesLabel?: string
}> = ({ label, value, onChange, yesLabel }) => {
  const options: RadioOption<BooleanFilterState>[] = [
    { value: "all", label: "Все" },
    { value: "yes", label: yesLabel ?? "Есть" },
    { value: "no", label: "Нет" },
  ]
  return (
    <RadioGroup
      label={label}
      options={options}
      value={value}
      onChange={onChange}
      variant="button"
    />
  )
}

const SolutionTypeFilterGroup: React.FC<{
  value: SolutionType | "all"
  onChange: (value: SolutionType | "all") => void
}> = ({ value, onChange }) => {
  const options: RadioOption<SolutionType | "all">[] = [
    { value: "all", label: "Все" },
    ...SOLUTION_TYPE_OPTIONS,
  ]
  return (
    <RadioGroup
      label="Тип ответа"
      options={options}
      value={value}
      onChange={onChange}
      variant="button"
    />
  )
}

// --- Main Page Component ---

const ScrapeSubjectPage: NextPage = () => {
  const router = useRouter()
  const { subjectId } = router.query
  const fipiSubjectId = subjectId as string

  const { data: session } = useSession()

  const [page, setPage] = useState(1)
  const [targetPage, setTargetPage] = useState<number | "">("")

  // Automation State
  const [isAutoScraping, setIsAutoScraping] = useState(false)
  const [isAutoEnriching, setIsAutoEnriching] = useState(false)
  const [isAutoSourceVerifying, setIsAutoSourceVerifying] = useState(false)

  // Topic Iteration Automation State
  const [isAutoTopicScraping, setIsAutoTopicScraping] = useState(false)
  const [topicQueue, setTopicQueue] = useState<string[]>([])
  const [activeAutomationTopicId, setActiveAutomationTopicId] = useState<
    string | undefined
  >()

  const [showExamPositionCategories, setShowExamPositionCategories] =
    useState(false)

  const [localChanges, setLocalChanges] = useState<{
    [id: string]: Partial<Pick<Question, "body" | "solution" | "work" | "hint">>
  }>({})

  // Filter hooks
  const { search, debouncedSearch, onSearchChange } = useSearchFilter()
  const { selectedTopicIds, onSelectedTopicIdsChange } =
    useTopicFilter(fipiSubjectId)
  const {
    selectedTopicIds: selectedExamPositionIds,
    onSelectedTopicIdsChange: onSelectedExamPositionIdsChange,
  } = useTopicFilter(fipiSubjectId, {
    isQueryParamSyncEnabled: true,
    paramName: "examPosition",
  })

  // Filter states
  const [sourceVerifiedFilter, setSourceVerifiedFilter] =
    useState<BooleanFilterState>("all")
  const [syntaxVerifiedFilter, setSyntaxVerifiedFilter] =
    useState<BooleanFilterState>("all")
  const [selectedReports, setSelectedReports] = useState<QuestionMetaType[]>([])
  const [solutionTypeFilter, setSolutionTypeFilter] = useState<
    SolutionType | "all"
  >("all")
  const [examPositionSetFilter, setExamPositionSetFilter] =
    useState<BooleanFilterState>("all")
  const [solutionFilter, setSolutionFilter] =
    useState<BooleanFilterState>("all")
  const [workFilter, setWorkFilter] = useState<BooleanFilterState>("all")
  const [hintFilter, setHintFilter] = useState<BooleanFilterState>("all")

  const apiUtils = api.useUtils()

  const { data: subject } = api.subject.getById.useQuery(
    { id: fipiSubjectId },
    { enabled: !!fipiSubjectId }
  )

  const examPositionsQuery = api.topic.getAllBySubject.useQuery({
    subjectId: fipiSubjectId,
    examPosition: true,
  })

  const { data: topics, isLoading: isLoadingTopics } =
    api.topic.getAllBySubject.useQuery(
      { subjectId: fipiSubjectId },
      { enabled: !!fipiSubjectId }
    )

  const isTopicAutomationRunning = isAutoTopicScraping

  const effectiveSingleTopicId = useMemo(() => {
    if (isTopicAutomationRunning && activeAutomationTopicId)
      return activeAutomationTopicId
    return undefined
  }, [isTopicAutomationRunning, activeAutomationTopicId])

  // Query Key Construction
  const queryKey: RouterInputs["question"]["getPaginated"] = {
    subjectId: fipiSubjectId,
    page,
    limit: 10,
    sources: [QuestionSource.FIPI],
    search: debouncedSearch || undefined,
    topicIds:
      isTopicAutomationRunning && activeAutomationTopicId
        ? [activeAutomationTopicId]
        : selectedTopicIds,
    verified: null,
    sourceVerified:
      sourceVerifiedFilter === "all" ? null : sourceVerifiedFilter === "yes",
    syntaxVerified:
      syntaxVerifiedFilter === "all" ? null : syntaxVerifiedFilter === "yes",
    reports: selectedReports.length > 0 ? selectedReports : undefined,
    solutionType: solutionTypeFilter === "all" ? undefined : solutionTypeFilter,
    examPositions:
      selectedExamPositionIds.length > 0
        ? selectedExamPositionIds
        : examPositionSetFilter === "all"
          ? null
          : examPositionSetFilter === "yes",
    hasSolution: solutionFilter === "all" ? null : solutionFilter === "yes",
    hasWork: workFilter === "all" ? null : workFilter === "yes",
    hasHint: hintFilter === "all" ? null : hintFilter === "yes",
  }

  const { data: paginatedData, isLoading: isLoadingQuestions } =
    api.question.getPaginated.useQuery(queryKey, {
      enabled: !!fipiSubjectId && !!topics && topics.length > 0,
      refetchOnWindowFocus:
        !isAutoScraping && !isAutoEnriching && !isTopicAutomationRunning,
    })

  const questions = paginatedData?.items
  const totalPages = paginatedData?.totalPages

  useEffect(() => {
    if (!isTopicAutomationRunning) {
      setPage(1)
    }
  }, [
    solutionTypeFilter,
    fipiSubjectId,
    sourceVerifiedFilter,
    syntaxVerifiedFilter,
    selectedReports,
    examPositionSetFilter,
    solutionFilter,
    workFilter,
    hintFilter,
    debouncedSearch,
    selectedTopicIds,
    isTopicAutomationRunning,
  ])

  useEffect(() => {
    setLocalChanges({})
  }, [page])

  const advanceAutomation = useCallback(() => {
    if (!targetPage) return

    if (page < targetPage) {
      setPage((prev) => prev + 1)

      return { action: "NEXT_PAGE", nextPage: page + 1 }
    }

    if (isAutoTopicScraping) {
      setTopicQueue((prevQueue) => {
        if (prevQueue.length === 0) {
          setIsAutoTopicScraping(false)
          setActiveAutomationTopicId(undefined)
          alert("Topic automation complete.")
          return []
        }

        const [nextTopic, ...rest] = prevQueue
        setActiveAutomationTopicId(nextTopic)
        setPage(1)

        return rest
      })
      return { action: "NEXT_TOPIC" }
    }

    setIsAutoScraping(false)
    setIsAutoEnriching(false)
    setIsAutoSourceVerifying(false)
    alert("Automation complete.")
    return { action: "DONE" }
  }, [targetPage, page, isAutoTopicScraping])

  const scrapeTopicsMutation = api.scraper.scrapeTopics.useMutation({
    onSuccess: () => {
      void apiUtils.topic.getAllBySubject.invalidate()
    },
  })

  const scrapePageMutation = api.scraper.scrapePage.useMutation({
    onSuccess: (data, variables) => {
      const finishedPage = variables.page
      void apiUtils.question.getPaginated.invalidate({
        subjectId: fipiSubjectId,
        page: finishedPage,
      })

      const effectiveTarget = targetPage || 999

      if (
        (isAutoScraping || isAutoTopicScraping) &&
        finishedPage < effectiveTarget
      ) {
        const nextPage = finishedPage + 1
        setPage(nextPage)
        scrapePageMutation.mutate({
          subjectId: fipiSubjectId,
          page: nextPage,
          topicId: effectiveSingleTopicId,
        })
      } else if (isAutoTopicScraping) {
        if (topicQueue.length > 0) {
          const nextTopic = topicQueue[0]!
          const newQueue = topicQueue.slice(1)

          setTopicQueue(newQueue)
          setActiveAutomationTopicId(nextTopic)
          setPage(1)

          scrapePageMutation.mutate({
            subjectId: fipiSubjectId,
            page: 1,
            topicId: nextTopic,
          })
        } else {
          setIsAutoTopicScraping(false)
          setActiveAutomationTopicId(undefined)
          alert("All topics scraped!")
        }
      } else {
        setIsAutoScraping(false)
      }
    },
    onError: (error) => {
      setIsAutoScraping(false)
      setIsAutoTopicScraping(false)
      alert(`Error scraping page ${error.message}. Stopping automation.`)
    },
  })

  const enrichOneMutation = api.question.enrichOne.useMutation({
    onSuccess: () => {
      void apiUtils.question.getPaginated.invalidate(queryKey)
    },
  })

  const enrichManyMutation = api.question.enrichMany.useMutation({
    onSuccess: (data) => {
      void apiUtils.question.getPaginated.invalidate(queryKey)

      if (isAutoEnriching) {
        advanceAutomation()
      } else {
        alert(`Successfully enriched ${data.enrichedCount} questions.`)
      }
    },
    onError: (error) => {
      setIsAutoEnriching(false)
      alert(`Error enriching page: ${error.message}. Stopping automation.`)
    },
  })

  const sourceVerifyManyMutation = api.question.sourceVerifyMany.useMutation({
    onSuccess: (data) => {
      void apiUtils.question.getPaginated.invalidate(queryKey)

      if (isAutoSourceVerifying) {
        advanceAutomation()
      } else {
        alert(`Successfully processed ${data.processedCount} questions.`)
      }
    },
    onError: (error) => {
      setIsAutoSourceVerifying(false)
      alert(`Error verifying page: ${error.message}. Stopping automation.`)
    },
  })

  const updateContentMutation = api.question.updateContent.useMutation({
    onMutate: async ({ id, ...data }) => {
      await apiUtils.question.getPaginated.cancel(queryKey)
      const previousData = apiUtils.question.getPaginated.getData(queryKey)
      apiUtils.question.getPaginated.setData(queryKey, (oldData) => {
        if (!oldData) return
        return {
          ...oldData,
          items: oldData.items.map((q) =>
            q.id === id ? { ...q, ...data } : q
          ),
        }
      })
      return { previousData }
    },
    onError: (err, _, context) => {
      apiUtils.question.getPaginated.setData(queryKey, context?.previousData)
      alert(`Failed to update content: ${err.message}`)
    },
  })

  const getMetaStatus = (question: Question) => {
    const isSyntaxVerified = question.metas.some(
      (m) => m.type === QuestionMetaType.SYNTAX_VERIFIED
    )
    const isSourceVerified = question.metas.some(
      (m) => m.type === QuestionMetaType.SOURCE_VERIFIED
    )
    return { isSyntaxVerified, isSourceVerified }
  }

  const updateMetaMutation = api.question.updateMeta.useMutation({
    onMutate: async ({ type, updates }) => {
      await apiUtils.question.getPaginated.cancel(queryKey)

      const previousData = apiUtils.question.getPaginated.getData(queryKey)

      // Optimistically update to the new value
      if (previousData) {
        apiUtils.question.getPaginated.setData(queryKey, (old) => {
          if (!old) return old

          return {
            ...old,
            items: old.items.map((q) => {
              if (updates[q.id] !== undefined) {
                const newValue = updates[q.id]!
                const otherMetas = q.metas.filter((m) => m.type !== type)

                const newMetas = newValue
                  ? [
                      ...otherMetas,
                      {
                        id: "optimistic",
                        type: type,
                        source: QuestionMetaSource.USER,
                        questionId: q.id,
                        userId: session?.user.id,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                      },
                    ]
                  : otherMetas

                return { ...q, metas: newMetas }
              }
              return q
            }),
          }
        })
      }

      return { previousData }
    },
    onError: (err, newTodo, context) => {
      if (context?.previousData) {
        apiUtils.question.getPaginated.setData(queryKey, context.previousData)
      }
      alert(`Failed to update status: ${err.message}`)
    },
    onSettled: () => {
      void apiUtils.question.getPaginated.invalidate(queryKey)
    },
  })

  const updateExamPositionMutation =
    api.question.updateExamPosition.useMutation({
      onMutate: async ({ id: questionId, examPositionId }) => {
        await apiUtils.question.getPaginated.cancel(queryKey)

        const previousData = apiUtils.question.getPaginated.getData(queryKey)

        apiUtils.question.getPaginated.setData(queryKey, (oldData) => {
          if (!oldData) return

          const examPositionTopics = examPositionsQuery.data
          if (!examPositionTopics) {
            return oldData
          }

          return {
            ...oldData,
            items: oldData.items.map((q) => {
              if (q.id !== questionId) {
                return q
              }

              const topicsToKeep = q.topics.filter(
                (questionToTopic) => questionToTopic.topic.examPosition === null
              )

              const updatedTopics = [...topicsToKeep]

              if (examPositionId !== null) {
                const targetTopic = examPositionTopics.find(
                  (topic) => topic.id === examPositionId
                )

                if (targetTopic) {
                  updatedTopics.push({
                    topic: targetTopic,
                  })

                  if (targetTopic.parentId) {
                    const parentTopic = examPositionTopics.find(
                      (topic) => topic.id === targetTopic.parentId
                    )
                    if (parentTopic) {
                      updatedTopics.push({
                        topic: parentTopic,
                      })
                    }
                  }
                }
              }

              return { ...q, topics: updatedTopics }
            }),
          }
        })

        return { previousData }
      },
      onError: (err, _, context) => {
        apiUtils.question.getPaginated.setData(queryKey, context?.previousData)
        alert(`Failed to update exam position: ${err.message}`)
      },
      onSettled: () => {
        void apiUtils.question.getPaginated.invalidate(queryKey)
      },
    })

  const handleScrapeTopics = () => {
    if (!fipiSubjectId) return
    scrapeTopicsMutation.mutate({ subjectId: fipiSubjectId })
  }

  const handleAutoScrape = () => {
    if (!fipiSubjectId || !targetPage || targetPage <= page) {
      alert("Please enter a target page number greater than the current page.")
      return
    }
    setIsAutoScraping(true)
    scrapePageMutation.mutate({
      subjectId: fipiSubjectId,
      page,
      topicId: effectiveSingleTopicId,
    })
  }

  const handleAutoTopicScrape = () => {
    if (selectedTopicIds.length === 0) {
      alert("Please select topics to scrape.")
      return
    }
    if (!targetPage) {
      alert("Target page required.")
      return
    }

    const queue = [...selectedTopicIds]
    const first = queue.shift()
    if (!first) return

    setTopicQueue(queue)
    setActiveAutomationTopicId(first)
    setPage(1)
    setIsAutoTopicScraping(true)

    scrapePageMutation.mutate({
      subjectId: fipiSubjectId,
      page: 1,
      topicId: first,
    })
  }

  const handleEnrichPage = useCallback(() => {
    if (isLoadingQuestions) return

    if (!questions || questions.length === 0) {
      if (isAutoEnriching) {
        advanceAutomation()
        return
      }
      return
    }

    const idsToEnrich = questions
      .filter(
        (q) =>
          q.solutionType !== SolutionType.LONG &&
          (!q.work || !q.solution || !q.hint)
      )
      .map((q) => q.id)

    if (idsToEnrich.length === 0) {
      if (isAutoEnriching) {
        advanceAutomation()
      } else {
        alert(
          "All non-LONG answer questions on this page are already enriched."
        )
      }
      return
    }
    enrichManyMutation.mutate({ ids: idsToEnrich })
  }, [
    questions,
    isAutoEnriching,
    advanceAutomation,
    enrichManyMutation,
    isLoadingQuestions,
  ])

  const handleAutoEnrich = () => {
    if (!fipiSubjectId || !targetPage || targetPage <= page) {
      alert("Please enter a target page number greater than the current page.")
      return
    }
    setIsAutoEnriching(true)
    handleEnrichPage()
  }

  const handleSourceVerifyPage = useCallback(() => {
    if (isLoadingQuestions) return

    if (!questions || questions.length === 0) {
      if (isAutoSourceVerifying) {
        advanceAutomation()
        return
      }
      return
    }

    const idsToVerify = questions
      .filter(
        (q) => q.solutionType !== SolutionType.LONG && q.solution !== null
      )
      .map((q) => q.id)

    if (idsToVerify.length === 0) {
      if (isAutoSourceVerifying) {
        advanceAutomation()
      } else {
        alert(
          "No verifiable questions on this page (missing solutions or LONG type)."
        )
      }
      return
    }

    sourceVerifyManyMutation.mutate({ ids: idsToVerify })
  }, [
    questions,
    isAutoSourceVerifying,
    advanceAutomation,
    sourceVerifyManyMutation,
    isLoadingQuestions,
  ])

  const handleAutoSourceVerify = () => {
    if (!fipiSubjectId || !targetPage || targetPage <= page) {
      alert("Please enter a target page number greater than the current page.")
      return
    }
    setIsAutoSourceVerifying(true)
    handleSourceVerifyPage()
  }

  useEffect(() => {
    const isAutomatingEnrichment = isAutoEnriching
    const isAutomatingVerification = isAutoSourceVerifying

    if (
      isAutomatingEnrichment &&
      questions &&
      !enrichManyMutation.isPending &&
      !isLoadingQuestions
    ) {
      handleEnrichPage()
    }

    if (
      isAutomatingVerification &&
      questions &&
      !sourceVerifyManyMutation.isPending &&
      !isLoadingQuestions
    ) {
      handleSourceVerifyPage()
    }
  }, [
    isLoadingQuestions,
    questions,
    isAutoEnriching,
    isAutoSourceVerifying,
    handleEnrichPage,
    enrichManyMutation.isPending,
    handleSourceVerifyPage,
    sourceVerifyManyMutation.isPending,
  ])

  const handleReportsChange = (
    newOptions: ListboxOptionType<QuestionMetaType>[]
  ) => {
    setSelectedReports(
      newOptions
        .map((o) => o.value)
        .filter((v): v is QuestionMetaType => v !== null)
    )
  }

  const selectedReportOptions = REPORT_OPTIONS.filter(
    (o) => o.value && selectedReports.includes(o.value)
  )

  const handleFieldChange = (
    questionId: string,
    field: "body" | "solution" | "work" | "hint",
    value: string
  ) => {
    setLocalChanges((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [field]: value,
      },
    }))
  }

  const handleFieldSave = (
    question: Question,
    field: "body" | "solution" | "work" | "hint",
    value?: string
  ) => {
    const changedValue = value ?? localChanges[question.id]?.[field]
    if (changedValue !== undefined && changedValue !== question[field]) {
      updateContentMutation.mutate({
        id: question.id,
        [field]: changedValue,
      })
    }
  }
  const isScrapingInProgress =
    scrapePageMutation.isPending || isAutoScraping || isAutoTopicScraping
  const isEnrichingInProgress = enrichManyMutation.isPending || isAutoEnriching
  const isSourceVerificationInProgress =
    sourceVerifyManyMutation.isPending || isAutoSourceVerifying
  const isAnyAutomationRunning =
    isScrapingInProgress ||
    isEnrichingInProgress ||
    isSourceVerificationInProgress

  const cardControls = (question: Question) => {
    const { isSyntaxVerified, isSourceVerified } = getMetaStatus(question)

    const isUpdatingThisVerification =
      updateMetaMutation.isPending &&
      updateMetaMutation.variables?.type === QuestionMetaType.SYNTAX_VERIFIED &&
      updateMetaMutation.variables?.updates[question.id] !== undefined

    return (
      <Stack className="gap-4 p-2">
        <Row className="gap-4">
          {!UNENRICHABLE_SOLUTION_TYPES.includes(question.solutionType) && (
            <div className={cn("flex items-center justify-start gap-2")}>
              {isSourceVerified ? (
                <>
                  <Check className="h-6 w-6 text-success" />
                  <span>Ответ сходится</span>
                </>
              ) : (
                <>
                  <X className="h-6 w-6 text-danger" />
                  <span>Ответ не сходится</span>
                </>
              )}
            </div>
          )}

          <Button
            size="lg"
            variant="primary-paper"
            className="flex-1 justify-start"
            onClick={() =>
              updateMetaMutation.mutate({
                type: QuestionMetaType.SYNTAX_VERIFIED,
                updates: { [question.id]: !isSyntaxVerified },
              })
            }
            disabled={isUpdatingThisVerification}
          >
            {isSyntaxVerified ? (
              <>
                <Check className="mr-2 h-6 w-6 text-success" />
                Текст проверен
              </>
            ) : (
              <>
                <X className="mr-2 h-6 w-6 text-danger" />
                Текст не проверен
              </>
            )}
          </Button>
        </Row>

        <Row className="gap-4">
          {REPORT_BUTTON_DATA.map(({ value, label }) => {
            if (!value) {
              return
            }
            const hasReport = question.metas.some((m) => m.type === value)
            const isUpdatingThisReport =
              updateMetaMutation.isPending &&
              updateMetaMutation.variables?.type === value &&
              updateMetaMutation.variables?.updates[question.id] !== undefined

            return (
              <Button
                key={value}
                size="sm"
                variant="primary-paper"
                className="flex-1 justify-start"
                onClick={() =>
                  updateMetaMutation.mutate({
                    type: value,
                    updates: { [question.id]: !hasReport },
                  })
                }
                disabled={isUpdatingThisReport}
              >
                {!hasReport ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-success" />
                    {label}
                  </>
                ) : (
                  <>
                    <X className="mr-2 h-4 w-4 text-danger" />
                    {label}
                  </>
                )}
              </Button>
            )
          })}
        </Row>
      </Stack>
    )
  }

  const cardFooter = (question: Question) => {
    const isEnrichingOne =
      enrichOneMutation.isPending &&
      enrichOneMutation.variables?.id === question.id
    const isUpdatingContent =
      updateContentMutation.isPending &&
      updateContentMutation.variables?.id === question.id

    const solutionValue =
      localChanges[question.id]?.solution ?? question.solution
    const workValue = localChanges[question.id]?.work ?? question.work
    const hintValue = localChanges[question.id]?.hint ?? question.hint

    const enrichmentUI = (
      <Stack className="gap-4">
        <Stack>
          <h4 className="font-semibold text-primary">Вопрос:</h4>
          <textarea
            value={localChanges[question.id]?.body ?? question.body ?? ""}
            onChange={(e) =>
              handleFieldChange(question.id, "body", e.target.value)
            }
            onBlur={() => handleFieldSave(question, "body")}
            className="min-h-[100px] w-full rounded-md border border-input bg-input px-3 py-2 text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            disabled={isUpdatingContent}
          />
        </Stack>
        {!UNENRICHABLE_SOLUTION_TYPES.includes(question.solutionType) ? (
          <>
            <Stack className="gap-1">
              <h4 className="font-semibold text-primary">Ответ:</h4>
              <QuestionSolutionBlock
                question={question}
                value={solutionValue}
                onChange={(v) => {
                  handleFieldChange(question.id, "solution", v)
                  if (
                    (
                      [
                        SolutionType.MULTICHOICE,
                        SolutionType.MULTIRESPONSE,
                        SolutionType.MULTICHOICEGROUP,
                      ] as SolutionType[]
                    ).includes(question.solutionType)
                  ) {
                    handleFieldSave(question, "solution", v)
                  }
                }}
                onBlur={() => handleFieldSave(question, "solution")}
                highlightImages
              />
            </Stack>

            <Stack className="gap-1">
              <h4 className="font-semibold text-primary">Решение:</h4>
              <Box className="text-lg">
                {workValue ? (
                  <Markdown highlightImages>{workValue}</Markdown>
                ) : (
                  "Нет решения"
                )}
              </Box>
              <textarea
                value={workValue ?? ""}
                onChange={(e) =>
                  handleFieldChange(question.id, "work", e.target.value)
                }
                onBlur={() => handleFieldSave(question, "work")}
                className="min-h-[100px] w-full rounded-md border border-input bg-input px-3 py-2 text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                disabled={isUpdatingContent}
              />
            </Stack>

            <Stack className="gap-1">
              <h4 className="font-semibold text-primary">Подсказка:</h4>
              <Box className="text-lg">
                {hintValue ? (
                  <Markdown highlightImages>{hintValue}</Markdown>
                ) : (
                  "Нет подсказки"
                )}
              </Box>
              <textarea
                value={hintValue ?? ""}
                onChange={(e) =>
                  handleFieldChange(question.id, "hint", e.target.value)
                }
                onBlur={() => handleFieldSave(question, "hint")}
                className="w-full rounded-md border border-input bg-input px-3 py-2 text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                disabled={isUpdatingContent}
              />
            </Stack>

            {!(question.work && question.solution) && (
              <div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => enrichOneMutation.mutate({ id: question.id })}
                  disabled={isEnrichingOne}
                >
                  {isEnrichingOne ? "Обработка..." : "Дополнить с помощью ИИ"}
                </Button>
              </div>
            )}
          </>
        ) : null}
      </Stack>
    )

    const handleExamPositionClick = (examPositionId: string) => {
      const isDeselecting = question.topics.some(
        (t) => t.topic.id === examPositionId
      )

      if (isDeselecting) {
        updateExamPositionMutation.mutate({
          id: question.id,
          examPositionId: null,
        })
        return
      }

      const examPositionTopics = examPositionsQuery.data
      if (!examPositionTopics) return

      const clickedTopic = examPositionTopics.find(
        (topic) => topic.id === examPositionId
      )
      if (!clickedTopic) return

      updateExamPositionMutation.mutate({
        id: question.id,
        examPositionId: examPositionId,
      })
    }

    const selectedExamPositions = question.topics.filter(
      (t) => t.topic.examPosition !== null
    )

    const examPositionUI = (
      <Stack className="gap-2">
        <p className="text-sm font-semibold text-secondary">Номер вопроса</p>
        <Stack className="gap-4">
          <Row className="flex-wrap gap-2">
            {examPositionsQuery.data
              ?.filter((p) => p.parentId === null)
              .map((p) => (
                <Button
                  key={p.id}
                  size="sm"
                  variant={
                    question.topics.some((t) => t.topic.id === p.id)
                      ? "primary"
                      : "primary-paper"
                  }
                  onClick={() => handleExamPositionClick(p.id)}
                  className="min-w-9"
                  disabled={
                    updateExamPositionMutation.isPending &&
                    updateExamPositionMutation.variables?.id === question.id
                  }
                >
                  {p.examPosition}
                </Button>
              ))}
          </Row>
          {selectedExamPositions.length > 0 && showExamPositionCategories && (
            <Stack className="flex-wrap gap-2">
              {examPositionsQuery.data
                ?.filter(
                  (p) =>
                    p.parentId ===
                    selectedExamPositions.find((t) => t.topic.parentId === null)
                      ?.topic.id
                )
                .map((p) => (
                  <Button
                    key={p.id}
                    size="sm"
                    variant={
                      question.topics.some((t) => t.topic.id === p.id)
                        ? "primary"
                        : "primary-paper"
                    }
                    onClick={() => handleExamPositionClick(p.id)}
                  >
                    {p.name}
                  </Button>
                ))}
            </Stack>
          )}
        </Stack>
      </Stack>
    )

    return (
      <Stack className="mt-4 gap-4">
        {enrichmentUI}
        {examPositionUI}
      </Stack>
    )
  }

  const paginationControl = useMemo(
    () => (
      <MemoizedPaginationControl
        page={page}
        setPage={setPage}
        totalPages={totalPages}
        disabled={isAnyAutomationRunning}
      />
    ),
    [page, setPage, totalPages, isAnyAutomationRunning]
  )

  if (!subject) {
    return (
      <DefaultLayout>
        <Container>
          <p>Subject with ID {fipiSubjectId} not found.</p>
        </Container>
      </DefaultLayout>
    )
  }

  return (
    <DefaultLayout>
      <Container className="py-8">
        <Stack className="gap-6">
          <h1 className="text-2xl font-bold">
            {subject.name} ({subject.id})
          </h1>
          {isLoadingTopics && <p>Загрузка тем...</p>}
          {!isLoadingTopics && (!topics || topics.length === 0) && (
            <div>
              <p>Темы не найдены.</p>
              <Button
                onClick={handleScrapeTopics}
                disabled={
                  scrapeTopicsMutation.isPending || isAnyAutomationRunning
                }
              >
                {scrapeTopicsMutation.isPending
                  ? "Темы скрейпятся..."
                  : "Скрейпить темы"}
              </Button>
            </div>
          )}
        </Stack>

        {isAutoScraping && (
          <p className="font-bold text-blue-500">
            Авто-скрейпинг страницы {page} из {targetPage}... Не закрывайте
            вкладку.
          </p>
        )}
        {isAutoTopicScraping && (
          <p className="font-bold text-purple-500">
            Авто-скрейпинг по темам. Текущая тема: {activeAutomationTopicId}.
            Страница {page} из {targetPage}. В очереди еще {topicQueue.length}{" "}
            тем.
          </p>
        )}
        {isAutoEnriching && (
          <p className="font-bold text-green-500">
            Авто-решение страницы {page} из {targetPage}... Не закрывайте
            вкладку.
          </p>
        )}

        <div className="flex flex-col gap-4 rounded-lg border border-primary bg-paper p-4">
          <div className="flex flex-wrap items-center gap-4">
            <Button
              onClick={handleEnrichPage}
              disabled={isAnyAutomationRunning}
            >
              {enrichManyMutation.isPending && !isAutoEnriching
                ? `Страница ${page} решается...`
                : "Решить страницу " + page}
            </Button>
            <Button
              onClick={handleSourceVerifyPage}
              disabled={isAnyAutomationRunning}
            >
              {sourceVerifyManyMutation.isPending && !isAutoSourceVerifying
                ? `Страница ${page} проверяется...`
                : "Проверить страницу " + page}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t pt-4 border-border/50">
            <span className="font-bold text-sm uppercase text-secondary">
              Автоматизация
            </span>
            <input
              type="number"
              value={targetPage}
              onChange={(e) =>
                setTargetPage(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              placeholder="до страницы..."
              min={page + 1}
              disabled={isAnyAutomationRunning}
              className="w-48 rounded-md border border-input bg-input px-3 py-2 text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />

            <div className="flex gap-2">
              <Button
                onClick={handleAutoScrape}
                disabled={isAnyAutomationRunning || !targetPage}
              >
                {isAutoScraping ? "Авто-скрейпинг..." : "Авто-скрейп"}
              </Button>
              <Button
                onClick={handleAutoEnrich}
                disabled={isAnyAutomationRunning || !targetPage}
              >
                {isAutoEnriching ? "Авто-решение..." : "Авто-решение"}
              </Button>
              <Button
                onClick={handleAutoSourceVerify}
                disabled={isAnyAutomationRunning || !targetPage}
              >
                {isAutoSourceVerifying ? "Авто-проверка..." : "Авто-проверка"}
              </Button>
            </div>

            <div className="h-6 w-[1px] bg-border mx-2"></div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handleAutoTopicScrape}
                disabled={
                  isAnyAutomationRunning ||
                  !targetPage ||
                  selectedTopicIds.length === 0
                }
              >
                {isAutoTopicScraping
                  ? "Темы скрейпятся..."
                  : "Скрейпить выбранные темы"}
              </Button>
            </div>
          </div>
        </div>

        {topics && topics.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-[1fr_3fr]">
            <Stack className="gap-4">
              <h2 className="text-xl font-bold">Фильтры</h2>
              <SearchFilter search={search} onSearchChange={onSearchChange} />
              {fipiSubjectId && (
                <TopicFilter
                  subjectId={fipiSubjectId}
                  selectedTopicIds={selectedTopicIds}
                  onSelectedTopicIdsChange={onSelectedTopicIdsChange}
                />
              )}
              <BooleanFilterGroup
                label="Ответ сходится"
                value={sourceVerifiedFilter}
                onChange={setSourceVerifiedFilter}
                yesLabel="Да"
              />
              <BooleanFilterGroup
                label="Текст проверен"
                value={syntaxVerifiedFilter}
                onChange={setSyntaxVerifiedFilter}
                yesLabel="Да"
              />
              <Listbox
                label="Репорты"
                multiple
                options={REPORT_OPTIONS}
                value={selectedReportOptions}
                onChange={handleReportsChange}
                placeholder="Все репорты"
                getButtonText={(vals) => `Выбрано: ${vals.length}`}
              />
              <SolutionTypeFilterGroup
                value={solutionTypeFilter}
                onChange={setSolutionTypeFilter}
              />
              <BooleanFilterGroup
                label="Номер вопроса"
                value={examPositionSetFilter}
                onChange={setExamPositionSetFilter}
              />
              <TopicFilter
                variant="examPosition"
                subjectId={fipiSubjectId}
                selectedTopicIds={selectedExamPositionIds}
                onSelectedTopicIdsChange={onSelectedExamPositionIdsChange}
              />
              <Checkbox
                label="Показывать подкатегории"
                checked={showExamPositionCategories}
                onChange={setShowExamPositionCategories}
              />
              <BooleanFilterGroup
                label="Ответ"
                value={solutionFilter}
                onChange={setSolutionFilter}
              />
              <BooleanFilterGroup
                label="Решение"
                value={workFilter}
                onChange={setWorkFilter}
              />
              <BooleanFilterGroup
                label="Подсказка"
                value={hintFilter}
                onChange={setHintFilter}
              />
            </Stack>

            <Stack className="gap-6">
              {paginationControl}

              {isLoadingQuestions && <SpinnerScreen />}

              {questions && questions.length > 0 ? (
                <Stack className="gap-4">
                  {questions.map((q) => (
                    <QuestionCard
                      key={q.id}
                      question={q}
                      hideSolutionBlock
                      footer={cardFooter}
                      controls={cardControls}
                      highlightImages
                    />
                  ))}
                </Stack>
              ) : (
                !isLoadingQuestions && <p>Вопросы не найдены.</p>
              )}

              {paginationControl}
            </Stack>
          </div>
        )}
      </Container>
    </DefaultLayout>
  )
}

export default ScrapeSubjectPage
