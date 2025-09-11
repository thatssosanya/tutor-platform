import Head from "next/head"
import Link from "next/link"
import React, { useState } from "react"

import DefaultLayout from "@/layouts/DefaultLayout"
import {
  Button,
  CheckboxGroup,
  Container,
  Input,
  Paper,
  Row,
  Stack,
} from "@/ui"
import { api } from "@/utils/api"

export default function SignUpPage() {
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([])

  const subjectsQuery = api.subject.getAll.useQuery()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setMessage("")

    const response = await fetch("/api/auth/sign-up", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, password, subjectIds: selectedSubjectIds }),
    })

    const data = await response.json()

    if (!response.ok) {
      setError(data.message || "Что-то пошло не так.")
    } else {
      setMessage(data.message || "Успешно! Теперь вы можете войти.")
      setName("")
      setPassword("")
      setSelectedSubjectIds([])
    }
  }

  const subjectOptions =
    subjectsQuery.data?.map((subject) => ({
      value: subject.id,
      label: subject.name,
    })) ?? []

  return (
    <>
      <Head>
        <title>Регистрация</title>
      </Head>
      <DefaultLayout>
        <Container className="my-auto md:max-w-md">
          <Paper>
            <form onSubmit={handleSignUp}>
              <Stack className="gap-6">
                <Stack className="gap-2 text-center">
                  <h1 className="text-2xl font-semibold tracking-tight text-primary">
                    Регистрация
                  </h1>
                  <p className="text-sm text-secondary">
                    Введите свои данные, чтобы создать аккаунт
                  </p>
                </Stack>

                <Stack className="gap-4">
                  <Stack className="gap-1.5">
                    <label htmlFor="name" className="text-sm font-medium">
                      Логин
                    </label>
                    <Input
                      id="name"
                      placeholder="Логин"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </Stack>
                  <Stack className="gap-1.5">
                    <label htmlFor="password" className="text-sm font-medium">
                      Пароль
                    </label>
                    <Input
                      id="password"
                      placeholder="Пароль"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </Stack>
                  <Stack className="gap-1.5">
                    <label className="text-sm font-medium">Предметы</label>
                    {subjectsQuery.isLoading ? (
                      <p>Загрузка предметов...</p>
                    ) : (
                      <CheckboxGroup
                        options={subjectOptions}
                        value={selectedSubjectIds}
                        onChange={setSelectedSubjectIds}
                        variant="button"
                      />
                    )}
                  </Stack>
                </Stack>

                {error && <p className="text-sm text-red-500">{error}</p>}
                {message && <p className="text-sm text-green-500">{message}</p>}

                <Row className="gap-2">
                  <Button type="submit" className="w-full">
                    Зарегистрироваться
                  </Button>
                  <Link href="/sign-in" className="w-full">
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full"
                    >
                      Войти
                    </Button>
                  </Link>
                </Row>
              </Stack>
            </form>
          </Paper>
        </Container>
      </DefaultLayout>
    </>
  )
}
