// eslint-disable-next-line import/no-anonymous-default-export
export default function () {
  ;<></>
}

// import type { NextPage } from "next"
// import { useRouter } from "next/router"
// import { useEffect, useState, Fragment } from "react"
// import { api } from "@/utils/api"
// import { Container } from "@/ui"
// import { QuestionCard } from "@/components/QuestionCard"

// const ScrapeSubjectPage: NextPage = () => {
//   const router = useRouter()
//   const { subjectId } = router.query
//   const fipiSubjectId = subjectId as string

//   const [page, setPage] = useState(1)
//   const [targetPage, setTargetPage] = useState<number | "">("")
//   const [isAutoScraping, setIsAutoScraping] = useState(false)

//   const apiUtils = api.useUtils()

//   const { data: subject, isLoading: isLoadingSubject } =
//     api.subject.getById.useQuery(
//       { id: fipiSubjectId },
//       { enabled: !!fipiSubjectId }
//     )

//   const { data: topics, isLoading: isLoadingTopics } =
//     api.topic.getAllBySubject.useQuery(
//       { subjectId: fipiSubjectId },
//       { enabled: !!fipiSubjectId }
//     )

//   const { data: paginatedData, isLoading: isLoadingQuestions } =
//     api.question.getWithOffset.useQuery(
//       { subjectId: fipiSubjectId, page },
//       {
//         enabled: !!fipiSubjectId && !!topics && topics.length > 0,
//         // Prevent distracting refetches while the automated process is running
//         refetchOnWindowFocus: !isAutoScraping,
//       }
//     )

//   const questions = paginatedData?.items
//   const totalPages = paginatedData?.totalPages

//   useEffect(() => {
//     setPage(1)
//   }, [fipiSubjectId])

//   const scrapePageMutation = api.scraper.scrapePage.useMutation({
//     onSuccess: (data, variables) => {
//       const finishedPage = variables.page
//       // Invalidate the query for the page that just finished scraping
//       void apiUtils.question.getWithOffset.invalidate({
//         subjectId: fipiSubjectId,
//         page: finishedPage,
//       })

//       // Check if the auto-scraping process should continue
//       if (isAutoScraping && targetPage && finishedPage <= targetPage) {
//         const nextPage = finishedPage + 1
//         // Update the UI to show the next page number
//         setPage(nextPage)
//         // *** This is the key change: fire the next mutation from here ***
//         scrapePageMutation.mutate({ subjectId: fipiSubjectId, page: nextPage })
//       } else {
//         // If we've reached the target page or were not auto-scraping, stop.
//         setIsAutoScraping(false)
//       }
//     },
//     onError: (error) => {
//       // Ensure we stop the process if any mutation in the chain fails
//       setIsAutoScraping(false)
//       alert(
//         `An error occurred while scraping page ${error.message}. Stopping automation.`
//       )
//     },
//   })

//   const scrapeTopicsMutation = api.scraper.scrapeTopics.useMutation({
//     onSuccess: () => {
//       void apiUtils.topic.getAllBySubject.invalidate()
//     },
//   })

//   const handleScrapeTopics = () => {
//     if (!fipiSubjectId) return
//     scrapeTopicsMutation.mutate({ subjectId: fipiSubjectId })
//   }

//   // Manually scrapes only the currently selected page
//   const handleScrapeSinglePage = () => {
//     if (!fipiSubjectId) return
//     scrapePageMutation.mutate({ subjectId: fipiSubjectId, page })
//   }

//   // Kicks off the automated scraping process
//   const handleAutoScrape = () => {
//     if (!fipiSubjectId || !targetPage || targetPage <= page) {
//       alert("Please enter a target page number greater than the current page.")
//       return
//     }
//     setIsAutoScraping(true)
//     // Start the chain by firing the mutation for the *current* page
//     scrapePageMutation.mutate({ subjectId: fipiSubjectId, page })
//   }

//   if (!router.isReady || isLoadingSubject) {
//     return <div>Loading...</div>
//   }

//   if (!subject) {
//     return (
//       <div>
//         Subject with ID {fipiSubjectId} not found. Go back to the subjects list
//         to create it.
//       </div>
//     )
//   }

//   const paginationButtons = totalPages
//     ? Array.from({ length: totalPages + 1 }, (_, i) => i + 1)
//     : []

//   const isScrapingInProgress = scrapePageMutation.isPending || isAutoScraping

//   return (
//     <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
//       <h1>
//         Scraping for: {subject.name} ({subject.id})
//       </h1>

//       {isLoadingTopics && <p>Loading topics...</p>}

//       {!isLoadingTopics && (!topics || topics.length === 0) && (
//         <div>
//           <p>No topics found for this subject.</p>
//           <button
//             onClick={handleScrapeTopics}
//             disabled={scrapeTopicsMutation.isPending || isScrapingInProgress}
//           >
//             {scrapeTopicsMutation.isPending
//               ? "Scraping Topics..."
//               : "Scrape Topics"}
//           </button>
//         </div>
//       )}

//       {topics && topics.length > 0 && (
//         <Fragment>
//           {paginationButtons.length > 0 && (
//             <div style={{ margin: "1rem 0" }}>
//               {paginationButtons.map((p) => (
//                 <button
//                   key={p}
//                   onClick={() => setPage(p)}
//                   disabled={isScrapingInProgress}
//                   style={{
//                     fontWeight: p === page ? "bold" : "normal",
//                     margin: "0 0.25rem",
//                   }}
//                 >
//                   {p}
//                 </button>
//               ))}
//             </div>
//           )}

//           <h2>Page {page}</h2>

//           {isAutoScraping && (
//             <p style={{ color: "blue", fontWeight: "bold" }}>
//               Automatically scraping page {page} of {targetPage}... Do not
//               navigate away.
//             </p>
//           )}

//           {isLoadingQuestions && <p>Loading questions...</p>}

//           {!isLoadingQuestions && (!questions || questions.length === 0) && (
//             <div>
//               <p>No questions found in the database for this page.</p>

//               <div
//                 style={{
//                   display: "flex",
//                   alignItems: "center",
//                   gap: "1rem",
//                   margin: "1rem 0",
//                 }}
//               >
//                 <button
//                   onClick={handleScrapeSinglePage}
//                   disabled={isScrapingInProgress}
//                 >
//                   {scrapePageMutation.isPending && !isAutoScraping
//                     ? `Scraping Page ${page}...`
//                     : `Scrape Page ${page}`}
//                 </button>
//                 <span>OR</span>
//                 <input
//                   type="number"
//                   value={targetPage}
//                   onChange={(e) =>
//                     setTargetPage(
//                       e.target.value === "" ? "" : Number(e.target.value)
//                     )
//                   }
//                   placeholder="Scrape until page..."
//                   min={page + 1}
//                   disabled={isScrapingInProgress}
//                 />
//                 <button
//                   onClick={handleAutoScrape}
//                   disabled={isScrapingInProgress}
//                 >
//                   {isAutoScraping
//                     ? "Scraping in Progress..."
//                     : "Start Auto-Scrape"}
//                 </button>
//               </div>
//             </div>
//           )}

//           {questions && questions.length > 0 && (
//             <Container>
//               {questions.map((q) => (
//                 <QuestionCard key={q.id} question={q} />
//               ))}
//             </Container>
//           )}
//         </Fragment>
//       )}
//     </div>
//   )
// }

// export default ScrapeSubjectPage
