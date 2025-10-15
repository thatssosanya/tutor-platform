import Head from "next/head"
import Link from "next/link"
import React from "react"

import ProtectedLayout from "@/layouts/ProtectedLayout"
import { Container, Paper, Stack } from "@/ui"
import { api } from "@/utils/api"
import { PermissionBit } from "@/utils/permissions"

export default function AdminIndexPage() {
  const { data: subjectsByGrade, isLoading } =
    api.subject.getAllByGrade.useQuery()

  return (
    <>
      <Head>
        <title>Админ-панель</title>
      </Head>
      <ProtectedLayout permissionBits={[PermissionBit.ADMIN]}>
        <Container className="md:max-w-2xl">
          <Paper>
            <Stack className="gap-6">
              <Stack>
                <h1 className="text-2xl font-bold">Скрейпинг</h1>
                <p className="mt-1 text-secondary">
                  Управление скрейпингом данных с ФИПИ.
                </p>
              </Stack>
              <Link
                href="/admin/scrape/subjects"
                className="text-accent hover:underline"
              >
                Предметы
              </Link>
              <Stack className="gap-2">
                <h2 className="font-semibold text-primary">
                  Скрейпинг по предметам:
                </h2>
                {isLoading && <p>Загрузка предметов...</p>}
                {(["9", "11"] as const).map((grade) => {
                  const subjects = subjectsByGrade?.[grade]
                  return (
                    <>
                      <h1>{grade === "9" ? "ОГЭ" : "ЕГЭ"}</h1>
                      {subjects && (
                        <ul className="list-disc list-inside">
                          {subjects.map((subject) => (
                            <li key={subject.id}>
                              <Link
                                href={`/admin/scrape/subjects/${subject.id}`}
                                className="text-accent hover:underline"
                              >
                                {subject.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )
                })}
              </Stack>
            </Stack>
          </Paper>
        </Container>
      </ProtectedLayout>
    </>
  )
}
