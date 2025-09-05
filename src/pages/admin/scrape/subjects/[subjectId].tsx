import type { NextPage } from "next"
import { useRouter } from "next/router"
import { useEffect, useState, Fragment } from "react"
import { api } from "@/utils/api"

const ScrapeSubjectPage: NextPage = () => {
  const router = useRouter()
  const { subjectId } = router.query
  const fipiSubjectId = subjectId as string

  const [page, setPage] = useState(1)
  const apiUtils = api.useUtils()

  const { data: subject, isLoading: isLoadingSubject } =
    api.subject.getById.useQuery(
      { id: fipiSubjectId },
      { enabled: !!fipiSubjectId }
    )

  const { data: topics, isLoading: isLoadingTopics } =
    api.topic.getBySubjectId.useQuery(
      { subjectId: fipiSubjectId },
      { enabled: !!fipiSubjectId }
    )

  const { data: totalPages } = api.question.getPageCount.useQuery(
    { subjectId: fipiSubjectId },
    { enabled: !!fipiSubjectId && !!topics && topics.length > 0 }
  )

  const { data: questions, isLoading: isLoadingQuestions } =
    api.question.getBySubjectPaginated.useQuery(
      { subjectId: fipiSubjectId, page },
      { enabled: !!fipiSubjectId && !!topics && topics.length > 0 }
    )

  useEffect(() => {
    setPage(1)
  }, [fipiSubjectId])

  const scrapeTopicsMutation = api.scraper.scrapeTopics.useMutation({
    onSuccess: () => {
      void apiUtils.topic.getBySubjectId.invalidate()
    },
  })

  const scrapePageMutation = api.scraper.scrapePage.useMutation({
    onSuccess: () => {
      void apiUtils.question.invalidate()
    },
  })

  const handleScrapeTopics = () => {
    if (!fipiSubjectId) return
    scrapeTopicsMutation.mutate({ subjectId: fipiSubjectId })
  }

  const handleScrapeQuestions = () => {
    if (!fipiSubjectId) return
    scrapePageMutation.mutate({ subjectId: fipiSubjectId, page })
  }

  if (!router.isReady || isLoadingSubject) {
    return <div>Loading...</div>
  }

  if (!subject) {
    return (
      <div>
        Subject with ID {fipiSubjectId} not found. Go back to the subjects list
        to create it.
      </div>
    )
  }

  const paginationButtons = Array.from(
    { length: (totalPages ?? 0) + 1 },
    (_, i) => i + 1
  )

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>
        Scraping for: {subject.name} ({subject.id})
      </h1>

      {isLoadingTopics && <p>Loading topics...</p>}

      {!isLoadingTopics && (!topics || topics.length === 0) && (
        <div>
          <p>No topics found for this subject.</p>
          <button
            onClick={handleScrapeTopics}
            disabled={scrapeTopicsMutation.isPending}
          >
            {scrapeTopicsMutation.isPending
              ? "Scraping Topics..."
              : "Scrape Topics"}
          </button>
        </div>
      )}

      {topics && topics.length > 0 && (
        <Fragment>
          <div style={{ margin: "1rem 0" }}>
            {paginationButtons.map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  fontWeight: p === page ? "bold" : "normal",
                  margin: "0 0.25rem",
                }}
              >
                {p}
              </button>
            ))}
          </div>

          <h2>Page {page}</h2>

          {isLoadingQuestions && <p>Loading questions...</p>}

          {!isLoadingQuestions && (!questions || questions.length === 0) && (
            <div>
              <p>No questions found in the database for this page.</p>
              <button
                onClick={handleScrapeQuestions}
                disabled={scrapePageMutation.isPending}
              >
                {scrapePageMutation.isPending
                  ? `Scraping Page ${page}...`
                  : `Start Scrape for Page ${page}`}
              </button>
            </div>
          )}

          {questions && questions.length > 0 && (
            <ul>
              {questions.map((q) => (
                <li key={q.id} style={{ margin: "1rem 0" }}>
                  <strong>{q.name}</strong>
                  <p style={{ whiteSpace: "pre-wrap" }}>{q.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Fragment>
      )}
    </div>
  )
}

export default ScrapeSubjectPage
