import { useEffect, useState } from "react"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/router"
import Head from "next/head"

import { Button, Container, Input, Paper, Row, Stack } from "@/ui"
import DefaultLayout from "@/layouts/DefaultLayout"
import { isTutor } from "@/utils/permissions"

export default function SignInPage() {
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === "authenticated" && session) {
      const permissions = session.user.permissions ?? 0
      if (isTutor(permissions)) {
        void router.push("/tutor/questions")
      } else {
        void router.push("/student/assignments")
      }
    }
  }, [status, session, router])

  if (status === "authenticated") {
    return (
      <DefaultLayout>
        <Container className="my-auto text-center">
          <p>Аутентификация...</p>
        </Container>
      </DefaultLayout>
    )
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setMessage("")

    const result = await signIn("credentials", {
      redirect: false,
      name,
      password,
    })

    if (result?.error) {
      setError("Неверный логин или пароль")
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setMessage("")

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      setError(data.message || "Что-то пошло не так.")
    } else {
      setMessage(data.message || "Успешно!")
      setName("")
      setPassword("")
    }
  }

  return (
    <>
      <Head>
        <title>Вход</title>
      </Head>
      <DefaultLayout>
        <Container className="my-auto md:max-w-md">
          <Paper>
            <form>
              <Stack className="gap-6">
                <Stack className="gap-2 text-center">
                  <h1 className="text-2xl font-semibold tracking-tight text-primary">
                    Вход или регистрация
                  </h1>
                  <p className="text-sm text-secondary">
                    Введите свои данные, чтобы продолжить
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
                </Stack>

                {error && <p className="text-sm text-red-500">{error}</p>}
                {message && <p className="text-sm text-green-500">{message}</p>}

                <Row className="gap-2">
                  <Button
                    type="submit"
                    onClick={handleSignIn}
                    className="w-full"
                  >
                    Войти
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSignUp}
                    className="w-full"
                  >
                    Зарегистрироваться
                  </Button>
                </Row>
              </Stack>
            </form>
          </Paper>
        </Container>
      </DefaultLayout>
    </>
  )
}
