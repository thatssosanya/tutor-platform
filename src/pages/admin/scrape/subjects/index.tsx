import type { NextPage } from "next"
import Link from "next/link"

import { api } from "@/utils/api"

const SubjectsPage: NextPage = () => {
  const apiUtils = api.useUtils()
  const { data: subjectsByGrade, isLoading } =
    api.subject.getAllByGrade.useQuery()
  const scrapeSubjectsMutation = api.scraper.scrapeSubjects.useMutation({
    onSuccess: () => {
      void apiUtils.subject.getAll.invalidate()
    },
  })

  const handleScrapeSubjects = (grade: "9" | "11") => {
    scrapeSubjectsMutation.mutate({ grade })
  }

  if (isLoading) {
    return <div>Загрузка предметов...</div>
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Предметы</h1>
      {(["9", "11"] as const).map((grade) => {
        const subjects = subjectsByGrade?.[grade]
        return (
          <>
            <h1>{grade === "9" ? "ОГЭ" : "ЕГЭ"}</h1>
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
                <p>В базе данных нет предметов.</p>
                <button
                  onClick={() => handleScrapeSubjects(grade)}
                  disabled={scrapeSubjectsMutation.isPending}
                >
                  {scrapeSubjectsMutation.isPending
                    ? "Скрейпинг..."
                    : "Скрейпить предметы с ФИПИ"}
                </button>
              </div>
            )}
          </>
        )
      })}
    </div>
  )
}

export default SubjectsPage
