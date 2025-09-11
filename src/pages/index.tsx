import { signOut, useSession } from "next-auth/react"
import Head from "next/head"

import { Button, Container, Paper, Stack } from "@/ui"
import ProtectedLayout from "@/layouts/ProtectedLayout"

export default function Home() {
  const { data: session } = useSession()

  return (
    <>
      <Head>
        <title>Tutor Platform</title>
      </Head>
      <ProtectedLayout>
        <Container className="my-auto md:max-w-md">
          <Paper>
            <Stack className="items-center gap-4 text-center">
              <h1 className="text-2xl font-bold text-primary mb-4">
                Tutor Platform
              </h1>

              <Stack className="gap-2">
                <p className="text-secondary">
                  Вы вошли как {session?.user?.displayName}
                </p>
                <Button variant="danger" onClick={() => void signOut()}>
                  Выйти
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Container>
      </ProtectedLayout>
    </>
  )
}
