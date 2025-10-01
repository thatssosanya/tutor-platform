import { useEffect, useState } from "react"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/router"
import Head from "next/head"
import Link from "next/link"

import { Button, Container, Input, Paper, Row, Spinner, Stack } from "@/ui"
import DefaultLayout from "@/layouts/DefaultLayout"
import { isStudent, isTutor } from "@/utils/permissions"

export default function SignInPage() {
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === "authenticated" && session) {
      const permissions = session.user.permissions ?? 0
      if (isTutor(permissions)) {
        void router.push("/tutor/questions")
      } else if (isStudent(permissions)) {
        void router.push("/student/assignments")
      } else {
        // TODO add no permissions page
      }
    }
  }, [status, session, router])

  if (status === "authenticated") {
    return (
      <DefaultLayout>
        <Container className="my-auto text-center">
          <Spinner />
        </Container>
      </DefaultLayout>
    )
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const result = await signIn("credentials", {
      redirect: false,
      name,
      password,
    })

    if (result?.error) {
      setError("Неверный логин или пароль")
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
            <form onSubmit={handleSignIn}>
              <Stack className="gap-6">
                <Stack className="gap-2 text-center">
                  <h1 className="text-2xl font-semibold tracking-tight text-primary">
                    Вход
                  </h1>
                  <p className="text-sm text-secondary">
                    Введите свои данные, чтобы продолжить
                  </p>
                </Stack>

                <Stack className="gap-4">
                  <Input
                    label="Логин"
                    placeholder="Логин"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    variant="primary-paper"
                    required
                  />
                  <Input
                    label="Пароль"
                    placeholder="Пароль"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    variant="primary-paper"
                    required
                  />
                </Stack>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <Row className="gap-2">
                  <Button type="submit" className="w-full">
                    Войти
                  </Button>
                  <Link href="/sign-up" className="w-full">
                    <Button
                      type="button"
                      variant="primary-paper"
                      className="w-full"
                    >
                      Зарегистрироваться
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
