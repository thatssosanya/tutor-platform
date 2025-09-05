import { signOut, useSession } from "next-auth/react"
import Head from "next/head"
import Link from "next/link"

import { Button, Container, Paper, Stack } from "@/ui"
import DefaultLayout from "@/layouts/DefaultLayout"

export default function Home() {
  const { data: session, status } = useSession()

  return (
    <>
      <Head>
        <title>Tutor Platform</title>
      </Head>
      <DefaultLayout>
        <Container className="my-auto md:max-w-md">
          <Paper>
            <Stack className="items-center gap-4 text-center">
              <h1 className="text-2xl font-bold text-primary mb-4">
                Tutor Platform
              </h1>

              {status === "loading" && (
                <p className="text-secondary">Загрузка...</p>
              )}

              {status === "authenticated" && session && (
                <Stack className="gap-2">
                  <p className="text-secondary">
                    Вы вошли как {session.user?.displayName}
                  </p>
                  <Button variant="danger" onClick={() => void signOut()}>
                    Выйти
                  </Button>
                </Stack>
              )}

              {status === "unauthenticated" && (
                <Stack className="gap-2">
                  <p className="text-secondary">Вы не авторизованы</p>
                  <Link href="/sign-in">
                    <Button>Войти</Button>
                  </Link>
                </Stack>
              )}
            </Stack>
          </Paper>
        </Container>
      </DefaultLayout>
    </>
  )
}
