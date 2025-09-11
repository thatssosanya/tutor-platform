import { SolutionType } from "@prisma/client"
import type { NextPage } from "next"
import { useRouter } from "next/router"
import React, { Fragment, useEffect, useState } from "react"
import Markdown from "react-markdown"
import rehypeKatex from "rehype-katex"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"

import { QuestionCard } from "@/components/questions/QuestionCard"
import DefaultLayout from "@/layouts/DefaultLayout"
import { Button, Container, Paper, Stack } from "@/ui"
import { api, type RouterOutputs } from "@/utils/api"
import { fixFrac } from "@/utils/latex"

type Question = RouterOutputs["question"]["getWithOffset"]["items"][number]

const ScrapeSubjectPage: NextPage = () => {
  const router = useRouter()
  const { subjectId } = router.query
  const fipiSubjectId = subjectId as string

  const [page, setPage] = useState(1)
  const [targetPage, setTargetPage] = useState<number | "">("")
  const [isAutoScraping, setIsAutoScraping] = useState(false)

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

  const { data: paginatedData, isLoading: isLoadingQuestions } =
    api.question.getWithOffset.useQuery(
      { subjectId: fipiSubjectId, page, limit: 10 },
      {
        enabled: !!fipiSubjectId && !!topics && topics.length > 0,
        refetchOnWindowFocus: !isAutoScraping,
      }
    )

  const questions = paginatedData?.items
  const totalPages = paginatedData?.totalPages

  useEffect(() => {
    setPage(1)
  }, [fipiSubjectId])

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
      void apiUtils.question.getWithOffset.invalidate({
        subjectId: fipiSubjectId,
        page,
      })
    },
  })

  const enrichManyMutation = api.question.enrichMany.useMutation({
    onSuccess: (data) => {
      alert(`Successfully enriched ${data.enrichedCount} questions.`)
      void apiUtils.question.getWithOffset.invalidate({
        subjectId: fipiSubjectId,
        page,
      })
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

  const handleEnrichPage = () => {
    if (!questions || questions.length === 0) return
    const idsToEnrich = questions
      .filter((q) => q.solutionType === SolutionType.SHORT && !q.work)
      .map((q) => q.id)

    if (idsToEnrich.length === 0) {
      alert("All SHORT answer questions on this page are already enriched.")
      return
    }
    enrichManyMutation.mutate({ ids: idsToEnrich })
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
            <Markdown
              remarkPlugins={[remarkMath, remarkGfm]}
              rehypePlugins={[rehypeKatex]}
            >
              {fixFrac(question.work)}
            </Markdown>
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
    return (
      <DefaultLayout>
        <Container>
          <p>Loading...</p>
        </Container>
      </DefaultLayout>
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
    ? Array.from({ length: totalPages + 1 }, (_, i) => i + 1)
    : []
  const isScrapingInProgress = scrapePageMutation.isPending || isAutoScraping
  const isEnrichingInProgress = enrichManyMutation.isPending

  return (
    <DefaultLayout>
      <Container className="py-8">
        <Stack className="gap-6">
          <h1 className="text-2xl font-bold">
            Scraping for: {subject.name} ({subject.id})
          </h1>

          {isLoadingTopics && <p>Loading topics...</p>}
          {!isLoadingTopics && (!topics || topics.length === 0) && (
            <div>
              <p>No topics found. Scrape them first.</p>
              <Button
                onClick={handleScrapeTopics}
                disabled={
                  scrapeTopicsMutation.isPending || isScrapingInProgress
                }
              >
                {scrapeTopicsMutation.isPending
                  ? "Scraping Topics..."
                  : "Scrape Topics"}
              </Button>
            </div>
          )}

          {topics && topics.length > 0 && (
            <Fragment>
              {isAutoScraping && (
                <p className="font-bold text-blue-500">
                  Auto-scraping page {page} of {targetPage}... Do not navigate
                  away.
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
                      disabled={isScrapingInProgress || isEnrichingInProgress}
                    >
                      {p}
                    </Button>
                  ))}
                </div>
              )}

              <h2 className="text-xl font-semibold">Page {page}</h2>

              {isLoadingQuestions && <p>Loading questions...</p>}
              {!isLoadingQuestions && (
                <Stack className="gap-4">
                  <div className="flex flex-wrap items-center gap-4 rounded-lg border border-primary bg-paper p-4">
                    <Button
                      onClick={handleScrapeSinglePage}
                      disabled={isScrapingInProgress || isEnrichingInProgress}
                    >
                      {scrapePageMutation.isPending && !isAutoScraping
                        ? `Scraping Page ${page}...`
                        : `Scrape Page ${page}`}
                    </Button>
                    <span>OR</span>
                    <input
                      type="number"
                      value={targetPage}
                      onChange={(e) =>
                        setTargetPage(
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                      placeholder="Scrape until page..."
                      min={page + 1}
                      disabled={isScrapingInProgress || isEnrichingInProgress}
                      className="w-48 rounded-md border border-input bg-input px-3 py-2 text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <Button
                      onClick={handleAutoScrape}
                      disabled={
                        isScrapingInProgress ||
                        isEnrichingInProgress ||
                        !targetPage
                      }
                    >
                      {isAutoScraping ? "Scraping..." : "Start Auto-Scrape"}
                    </Button>
                  </div>

                  {!questions ||
                    (questions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-primary bg-paper p-4">
                        <Button
                          onClick={handleEnrichPage}
                          disabled={
                            isScrapingInProgress || isEnrichingInProgress
                          }
                        >
                          {isEnrichingInProgress
                            ? "Enriching Page..."
                            : "Enrich Page with AI"}
                        </Button>
                      </div>
                    ))}
                </Stack>
              )}

              {questions && questions.length > 0 ? (
                <Stack className="gap-4">
                  {questions.map((q) => (
                    <QuestionCard key={q.id} question={q} footer={cardFooter} />
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
