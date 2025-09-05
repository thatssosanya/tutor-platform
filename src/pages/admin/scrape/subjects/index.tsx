import type { NextPage } from "next"
import Link from "next/link"
import { api } from "@/utils/api"

const SubjectsPage: NextPage = () => {
  const apiUtils = api.useUtils()
  const { data: subjects, isLoading } = api.subject.getAll.useQuery()
  const scrapeSubjectsMutation = api.scraper.scrapeSubjects.useMutation({
    onSuccess: () => {
      void apiUtils.subject.getAll.invalidate()
    },
  })

  const handleScrapeSubjects = () => {
    scrapeSubjectsMutation.mutate()
  }

  if (isLoading) {
    return <div>Loading subjects...</div>
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Subjects</h1>
      {subjects && subjects.length > 0 ? (
        <ul>
          {subjects.map((subject) => (
            <li key={subject.id}>
              <Link href={`/admin/scrape/subjects/${subject.id}`}>
                {subject.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div>
          <p>No subjects found in the database.</p>
          <button
            onClick={handleScrapeSubjects}
            disabled={scrapeSubjectsMutation.isPending}
          >
            {scrapeSubjectsMutation.isPending
              ? "Scraping..."
              : "Scrape Subjects from FIPI"}
          </button>
        </div>
      )}
    </div>
  )
}

export default SubjectsPage
