import { SolutionType } from "@prisma/client"
import type { NextPage } from "next"
import { useRouter } from "next/router"
import React, { Fragment, useCallback, useEffect, useState } from "react"

import { QuestionCard } from "@/components/questions/QuestionCard"
import DefaultLayout from "@/layouts/DefaultLayout"
import {
  Button,
  Container,
  Paper,
  Row,
  Spinner,
  Stack,
  RadioGroup,
  type RadioOption,
} from "@/ui"
import { api, type RouterOutputs } from "@/utils/api"
import { Markdown } from "@/components/Markdown"
import { Check, X } from "lucide-react"
import { SpinnerScreen } from "@/components/SpinnerScreen"

type Question = RouterOutputs["question"]["getWithOffset"]["items"][number]
type BooleanFilterState = "all" | "yes" | "no"

// --- Helper Filter Components ---

const BooleanFilterGroup: React.FC<{
  label: string
  value: BooleanFilterState
  onChange: (value: BooleanFilterState) => void
}> = ({ label, value, onChange }) => {
  const options: RadioOption<BooleanFilterState>[] = [
    { value: "all", label: "Все" },
    { value: "yes", label: "Есть" },
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

const VerifiedFilterGroup: React.FC<{
  value: BooleanFilterState
  onChange: (value: BooleanFilterState) => void
}> = ({ value, onChange }) => {
  const options: RadioOption<BooleanFilterState>[] = [
    { value: "all", label: "Все" },
    { value: "yes", label: "Да" },
    { value: "no", label: "Нет" },
  ]
  return (
    <RadioGroup
      label="Подтвержден"
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

  const [page, setPage] = useState(1)
  const [targetPage, setTargetPage] = useState<number | "">("")
  const [isAutoScraping, setIsAutoScraping] = useState(false)
  const [isAutoEnriching, setIsAutoEnriching] = useState(false)

  // Filter states
  const [verifiedFilter, setVerifiedFilter] =
    useState<BooleanFilterState>("all")
  const [examPositionFilter, setExamPositionFilter] =
    useState<BooleanFilterState>("all")
  const [solutionFilter, setSolutionFilter] =
    useState<BooleanFilterState>("all")
  const [workFilter, setWorkFilter] = useState<BooleanFilterState>("all")
  const [hintFilter, setHintFilter] = useState<BooleanFilterState>("all")

  const apiUtils = api.useUtils()

  const { data: subject, isLoading: isLoadingSubject } =
    api.subject.getById.useQuery(
      { id: fipiSubjectId },
      { enabled: !!fipiSubjectId }
    )

  const { data: topics, isLoading: isLoadingTopics } =
    api.topic.getAllBySubject.useQuery(
      { subjectId: fipiSubjectId },
      { enabled: !!fipiSubjectId }
    )

  const queryKey = {
    subjectId: fipiSubjectId,
    page,
    limit: 10,
    verified: verifiedFilter === "all" ? null : verifiedFilter === "yes",
    hasExamPosition:
      examPositionFilter === "all" ? null : examPositionFilter === "yes",
    hasSolution: solutionFilter === "all" ? null : solutionFilter === "yes",
    hasWork: workFilter === "all" ? null : workFilter === "yes",
    hasHint: hintFilter === "all" ? null : hintFilter === "yes",
  }
  const { data: paginatedData, isLoading: isLoadingQuestions } =
    api.question.getWithOffset.useQuery(queryKey, {
      enabled: !!fipiSubjectId && !!topics && topics.length > 0,
      refetchOnWindowFocus: !isAutoScraping && !isAutoEnriching,
    })

  const questions = paginatedData?.items
  const totalPages = paginatedData?.totalPages

  useEffect(() => {
    setPage(1)
  }, [
    fipiSubjectId,
    verifiedFilter,
    examPositionFilter,
    solutionFilter,
    workFilter,
    hintFilter,
  ])

  const scrapeTopicsMutation = api.scraper.scrapeTopics.useMutation({
    onSuccess: () => {
      void apiUtils.topic.getAllBySubject.invalidate()
    },
  })

  const scrapePageMutation = api.scraper.scrapePage.useMutation({
    onSuccess: (data, variables) => {
      const finishedPage = variables.page
      void apiUtils.question.getWithOffset.invalidate({
        subjectId: fipiSubjectId,
        page: finishedPage,
      })
      if (isAutoScraping && targetPage && finishedPage < targetPage) {
        const nextPage = finishedPage + 1
        setPage(nextPage)
        scrapePageMutation.mutate({ subjectId: fipiSubjectId, page: nextPage })
      } else {
        setIsAutoScraping(false)
      }
    },
    onError: (error) => {
      setIsAutoScraping(false)
      alert(`Error scraping page ${error.message}. Stopping automation.`)
    },
  })

  const enrichOneMutation = api.question.enrichOne.useMutation({
    onSuccess: () => {
      void apiUtils.question.getWithOffset.invalidate(queryKey)
    },
  })

  const enrichManyMutation = api.question.enrichMany.useMutation({
    onSuccess: (data) => {
      void apiUtils.question.getWithOffset.invalidate(queryKey)

      if (isAutoEnriching && targetPage && page < targetPage) {
        setPage((prevPage) => prevPage + 1)
      } else if (isAutoEnriching) {
        setIsAutoEnriching(false)
        alert("Auto-enrichment complete.")
      } else {
        alert(`Successfully enriched ${data.enrichedCount} questions.`)
      }
    },
    onError: (error) => {
      ;(setIsAutoEnriching(false),
        alert(`Error enriching page: ${error.message}. Stopping automation.`))
    },
  })

  const updateVerificationsMutation =
    api.question.updateVerifications.useMutation({
      onMutate: async ({ updates }) => {
        await apiUtils.question.getWithOffset.cancel(queryKey)
        const previousData = apiUtils.question.getWithOffset.getData(queryKey)
        const questionId = Object.keys(updates)[0]
        const newStatus = updates[questionId!]
        if (!questionId) return { previousData }
        apiUtils.question.getWithOffset.setData(queryKey, (oldData) => {
          if (!oldData) return
          return {
            ...oldData,
            items: oldData.items.map((q) =>
              q.id === questionId ? { ...q, verified: newStatus ?? false } : q
            ),
          }
        })
        return { previousData }
      },
      onError: (err, newTodo, context) => {
        apiUtils.question.getWithOffset.setData(queryKey, context?.previousData)
        alert(`Failed to update status: ${err.message}`)
      },
      onSettled: () => {
        void apiUtils.question.getWithOffset.invalidate(queryKey)
      },
    })

  const updateExamPositionMutation =
    api.question.updateExamPosition.useMutation({
      onMutate: async ({ id, examPosition }) => {
        await apiUtils.question.getWithOffset.cancel(queryKey)
        const previousData = apiUtils.question.getWithOffset.getData(queryKey)
        apiUtils.question.getWithOffset.setData(queryKey, (oldData) => {
          if (!oldData) return
          return {
            ...oldData,
            items: oldData.items.map((q) =>
              q.id === id ? { ...q, examPosition } : q
            ),
          }
        })
        return { previousData }
      },
      onError: (err, _, context) => {
        apiUtils.question.getWithOffset.setData(queryKey, context?.previousData)
        alert(`Failed to update exam position: ${err.message}`)
      },
      onSettled: () => {
        void apiUtils.question.getWithOffset.invalidate(queryKey)
      },
    })

  const handleScrapeTopics = () => {
    if (!fipiSubjectId) return
    scrapeTopicsMutation.mutate({ subjectId: fipiSubjectId })
  }

  const handleScrapeSinglePage = () => {
    if (!fipiSubjectId) return
    scrapePageMutation.mutate({ subjectId: fipiSubjectId, page })
  }

  const handleAutoScrape = () => {
    if (!fipiSubjectId || !targetPage || targetPage <= page) {
      alert("Please enter a target page number greater than the current page.")
      return
    }
    setIsAutoScraping(true)
    scrapePageMutation.mutate({ subjectId: fipiSubjectId, page })
  }

  const handleEnrichPage = useCallback(() => {
    if (!questions || questions.length === 0) return
    const idsToEnrich = questions
      .filter((q) => q.solutionType === SolutionType.SHORT && !q.work)
      .map((q) => q.id)

    if (idsToEnrich.length === 0) {
      if (isAutoEnriching) {
        if (targetPage && page < targetPage) {
          setPage((prevPage) => prevPage + 1)
        } else {
          setIsAutoEnriching(false)
          alert("Auto-enrichment complete.")
        }
      } else {
        alert("All SHORT answer questions on this page are already enriched.")
      }
      return
    }
    enrichManyMutation.mutate({ ids: idsToEnrich })
  }, [questions, isAutoEnriching, page, targetPage, enrichManyMutation])

  const handleAutoEnrich = () => {
    if (!fipiSubjectId || !targetPage || targetPage <= page) {
      alert("Please enter a target page number greater than the current page.")
      return
    }
    setIsAutoEnriching(true)
    handleEnrichPage()
  }

  useEffect(() => {
    if (isAutoEnriching && questions && !enrichManyMutation.isPending) {
      handleEnrichPage()
    }
  }, [
    isAutoEnriching,
    questions,
    handleEnrichPage,
    enrichManyMutation.isPending,
  ])

  const cardControls = (question: Question) => {
    const isUpdatingThis =
      updateVerificationsMutation.isPending &&
      updateVerificationsMutation.variables?.updates[question.id] !== undefined

    return (
      <div className="p-2">
        <Button
          size="lg"
          variant="primary-paper"
          onClick={() =>
            updateVerificationsMutation.mutate({
              updates: { [question.id]: !question.verified },
            })
          }
          disabled={isUpdatingThis}
        >
          {question.verified ? (
            <>
              <Check className="mr-4 h-6 w-6 text-success" />
              Подтвержден
            </>
          ) : (
            <>
              <X className="mr-4 h-6 w-6 text-danger" />
              Неподтвержден
            </>
          )}
        </Button>
      </div>
    )
  }

  const cardFooter = (question: Question) => {
    const isEnrichingOne =
      enrichOneMutation.isPending &&
      enrichOneMutation.variables?.id === question.id

    const enrichmentUI =
      question.solutionType === SolutionType.SHORT ? (
        question.work && question.solution ? (
          <Stack className="gap-2 text-sm">
            <h4 className="font-semibold text-primary">Ответ:</h4>
            <p className="font-mono rounded-md bg-muted p-2 text-primary">
              {question.solution ?? "Нет ответа"}
            </p>
            <h4 className="font-semibold text-primary">Решение:</h4>
            {question.work ? (
              <Markdown>{question.work}</Markdown>
            ) : (
              "Нет решения"
            )}
            <h4 className="font-semibold text-primary">Подсказка:</h4>
            {question.hint ? (
              <Markdown>{question.hint}</Markdown>
            ) : (
              "Нет подсказки"
            )}
          </Stack>
        ) : (
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
        )
      ) : null

    const examPositionButtons = Array.from({ length: 26 }, (_, i) => i).slice(1)
    const handleExamPositionClick = (pos: number) => {
      updateExamPositionMutation.mutate({
        id: question.id,
        examPosition: question.examPosition === pos ? null : pos,
      })
    }

    const examPositionUI = (
      <Stack className="gap-2">
        <p className="text-sm font-semibold text-secondary">Номер вопроса</p>
        <Row className="flex-wrap gap-1">
          {examPositionButtons.map((pos) => (
            <Button
              key={pos}
              size="sm"
              variant={
                question.examPosition === pos ? "primary" : "primary-paper"
              }
              onClick={() => handleExamPositionClick(pos)}
              className="min-w-9"
              disabled={
                updateExamPositionMutation.isPending &&
                updateExamPositionMutation.variables?.id === question.id
              }
            >
              {pos}
            </Button>
          ))}
        </Row>
      </Stack>
    )

    return (
      <Stack className="mt-4 gap-4">
        {enrichmentUI}
        {examPositionUI}
      </Stack>
    )
  }

  if (!subject) {
    return (
      <DefaultLayout>
        <Container>
          <p>Subject with ID {fipiSubjectId} not found.</p>
        </Container>
      </DefaultLayout>
    )
  }

  const paginationButtons = totalPages
    ? Array.from({ length: totalPages }, (_, i) => i + 1)
    : []
  const isScrapingInProgress = scrapePageMutation.isPending || isAutoScraping
  const isEnrichingInProgress = enrichManyMutation.isPending || isAutoEnriching
  const isAnyAutomationRunning = isScrapingInProgress || isEnrichingInProgress

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
        {isAutoEnriching && (
          <p className="font-bold text-green-500">
            Авто-решение страницы {page} из {targetPage}... Не закрывайте
            вкладку.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-primary bg-paper p-4">
          <Button
            onClick={handleScrapeSinglePage}
            disabled={isAnyAutomationRunning}
          >
            {scrapePageMutation.isPending && !isAutoScraping
              ? `Страница ${page} скрейпится...`
              : `Скрейпить страницу ${page}`}
          </Button>
          <Button onClick={handleEnrichPage} disabled={isAnyAutomationRunning}>
            {enrichManyMutation.isPending && !isAutoEnriching
              ? `Страница ${page} решается...`
              : "Решить страницу " + page}
          </Button>
          <span>/</span>
          <input
            type="number"
            value={targetPage}
            onChange={(e) =>
              setTargetPage(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="до страницы..."
            min={page + 1}
            disabled={isAnyAutomationRunning}
            className="w-48 rounded-md border border-input bg-input px-3 py-2 text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <Button
            onClick={handleAutoScrape}
            disabled={isAnyAutomationRunning || !targetPage}
          >
            {isAutoScraping ? "Авто-скрейпится..." : "Начать авто-скрейпинг"}
          </Button>
          <Button
            onClick={handleAutoEnrich}
            disabled={isAnyAutomationRunning || !targetPage}
          >
            {isAutoEnriching ? "Авто-решается..." : "Начать авто-решение"}
          </Button>
        </div>

        {topics && topics.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-[1fr_3fr]">
            <Stack className="gap-4">
              <h2 className="text-xl font-bold">Фильтры</h2>
              <VerifiedFilterGroup
                value={verifiedFilter}
                onChange={setVerifiedFilter}
              />
              <BooleanFilterGroup
                label="Номер вопроса"
                value={examPositionFilter}
                onChange={setExamPositionFilter}
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
              {paginationButtons.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {paginationButtons.map((p) => (
                    <Button
                      key={p}
                      size="sm"
                      variant={p === page ? "primary" : "secondary"}
                      onClick={() => setPage(p)}
                      disabled={isAnyAutomationRunning}
                    >
                      {p}
                    </Button>
                  ))}
                </div>
              )}

              {isLoadingQuestions && <SpinnerScreen />}

              {questions && questions.length > 0 ? (
                <Stack className="gap-4">
                  {questions.map((q) => (
                    <QuestionCard
                      key={q.id}
                      question={q}
                      footer={cardFooter}
                      controls={cardControls}
                    />
                  ))}
                </Stack>
              ) : (
                !isLoadingQuestions && <p>Вопросы не найдены.</p>
              )}
            </Stack>
          </div>
        )}
      </Container>
    </DefaultLayout>
  )
}

export default ScrapeSubjectPage
