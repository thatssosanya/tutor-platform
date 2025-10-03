import { SolutionType } from "@prisma/client"
import type { NextPage } from "next"
import { useRouter } from "next/router"
import React, { Fragment, useCallback, useEffect, useState } from "react"

import { QuestionCard } from "@/components/questions/QuestionCard"
import DefaultLayout from "@/layouts/DefaultLayout"
import { Button, Container, Paper, Spinner, Stack } from "@/ui"
import { api, type RouterOutputs } from "@/utils/api"
import { Markdown } from "@/components/Markdown"
import { Check, X } from "lucide-react"
import { SpinnerScreen } from "@/components/SpinnerScreen"

type Question = RouterOutputs["question"]["getWithOffset"]["items"][number]

const ScrapeSubjectPage: NextPage = () => {
  const router = useRouter()
  const { subjectId } = router.query
  const fipiSubjectId = subjectId as string

  const [page, setPage] = useState(1)
  const [targetPage, setTargetPage] = useState<number | "">("")
  const [isAutoScraping, setIsAutoScraping] = useState(false)
  const [isAutoEnriching, setIsAutoEnriching] = useState(false)
  // Local state for verification status has been removed.

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

  const queryKey = { subjectId: fipiSubjectId, page, limit: 10 }
  const { data: paginatedData, isLoading: isLoadingQuestions } =
    api.question.getWithOffset.useQuery(queryKey, {
      enabled: !!fipiSubjectId && !!topics && topics.length > 0,
      refetchOnWindowFocus: !isAutoScraping && !isAutoEnriching,
    })

  const questions = paginatedData?.items
  const totalPages = paginatedData?.totalPages

  useEffect(() => {
    setPage(1)
  }, [fipiSubjectId])

  // All useEffects managing local verification state have been removed.

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
  }, [isAutoEnriching, questions, handleEnrichPage])

  // `handleSaveVerification` and `handleToggleVerified` are no longer needed.

  const cardControls = (question: Question) => {
    // Check if this specific question is the one currently being mutated.
    const isUpdatingThis =
      updateVerificationsMutation.isPending &&
      updateVerificationsMutation.variables?.updates[question.id] !== undefined

    return (
      <div className="p-2">
        <Button
          size="lg"
          variant="secondary"
          onClick={() =>
            updateVerificationsMutation.mutate({
              updates: { [question.id]: !question.verified },
            })
          }
          disabled={isUpdatingThis}
        >
          {question.verified ? (
            <>
              <Check className="h-6 w-6 text-success mr-4" />
              Подтвержден
            </>
          ) : (
            <>
              <X className="h-6 w-6 text-danger mr-4" />
              Неподтвержден
            </>
          )}
        </Button>
      </div>
    )
  }

  const cardFooter = (question: Question) => {
    if (question.solutionType !== SolutionType.SHORT) return null

    const isEnrichingOne =
      enrichOneMutation.isPending &&
      enrichOneMutation.variables?.id === question.id

    if (question.work && question.solution) {
      return (
        <Stack className="mt-4 gap-2 text-sm">
          <h4 className="font-semibold text-primary">Решение:</h4>
          <Paper className="bg-muted p-3">
            <Markdown>{question.work}</Markdown>
          </Paper>
          <h4 className="font-semibold text-primary">Ответ:</h4>
          <p className="font-mono rounded-md bg-muted p-2 text-primary">
            {question.solution}
          </p>
        </Stack>
      )
    }
    return (
      <div className="mt-4">
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
  }

  if (!router.isReady || isLoadingSubject) {
    return <SpinnerScreen />
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
    ? Array.from({ length: totalPages + 1 }, (_, i) => i + 1)
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

          {topics && topics.length > 0 && (
            <Fragment>
              {isAutoScraping && (
                <p className="font-bold text-blue-500">
                  Авто-скрейпинг страницы {page} из {targetPage}... Не
                  закрывайте вкладку.
                </p>
              )}
              {isAutoEnriching && (
                <p className="font-bold text-green-500">
                  Авто-решение страницы {page} из {targetPage}... Не закрывайте
                  вкладку.
                </p>
              )}

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

              {isLoadingQuestions && <p>Загрузка вопросов...</p>}
              {!isLoadingQuestions && (
                <Stack className="gap-4">
                  <div className="flex flex-wrap items-center gap-4 rounded-lg border border-primary bg-paper p-4">
                    <Button
                      onClick={handleScrapeSinglePage}
                      disabled={isAnyAutomationRunning}
                    >
                      {scrapePageMutation.isPending && !isAutoScraping
                        ? `Страница ${page} скрейпится...`
                        : `Скрейпить страницу ${page}`}
                    </Button>
                    <Button
                      onClick={handleEnrichPage}
                      disabled={isAnyAutomationRunning}
                    >
                      {enrichManyMutation.isPending && !isAutoEnriching
                        ? `Страница ${page} решается...`
                        : "Решить страницу " + page}
                    </Button>
                    <span>/</span>
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
                    <Button
                      onClick={handleAutoScrape}
                      disabled={isAnyAutomationRunning || !targetPage}
                    >
                      {isAutoScraping
                        ? "Авто-скрейпится..."
                        : "Начать авто-скрейпинг"}
                    </Button>
                    <Button
                      onClick={handleAutoEnrich}
                      disabled={isAnyAutomationRunning || !targetPage}
                    >
                      {isAutoEnriching
                        ? "Авто-решается..."
                        : "Начать авто-решение"}
                    </Button>
                  </div>
                </Stack>
              )}

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
                !isLoadingQuestions && (
                  <p>No questions found in DB for this page.</p>
                )
              )}
            </Fragment>
          )}
        </Stack>
      </Container>
    </DefaultLayout>
  )
}

export default ScrapeSubjectPage
