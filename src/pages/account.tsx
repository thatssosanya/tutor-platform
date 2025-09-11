import { signOut } from "next-auth/react"
import Head from "next/head"
import React, { useEffect, useState } from "react"

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
import ProtectedLayout from "@/layouts/ProtectedLayout"

export default function AccountPage() {
  const [displayName, setDisplayName] = useState("")
  const [password, setPassword] = useState("")
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([])

  const profileQuery = api.user.getProfile.useQuery()
  const subjectsQuery = api.subject.getAll.useQuery()

  useEffect(() => {
    if (profileQuery.data) {
      setDisplayName(profileQuery.data.displayName)
      setSelectedSubjectIds(profileQuery.data.subjects.map((s) => s.id))
    }
  }, [profileQuery.data])

  const updateProfileMutation = api.user.updateProfile.useMutation({
    onSuccess: async () => {
      await signOut({ callbackUrl: "/sign-in" })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfileMutation.mutate({
      displayName,
      subjectIds: selectedSubjectIds,
      ...(password && { password }),
    })
  }

  const subjectOptions =
    subjectsQuery.data?.map((subject) => ({
      value: subject.id,
      label: subject.name,
    })) ?? []

  return (
    <>
      <Head>
        <title>Мой аккаунт</title>
      </Head>
      <ProtectedLayout>
        <Container className="md:max-w-2xl">
          <Paper>
            <form onSubmit={handleSubmit}>
              <Stack className="gap-6">
                <Stack className="gap-2">
                  <h1 className="text-2xl font-bold text-primary">
                    Мой аккаунт
                  </h1>
                  <p className="text-sm text-secondary">
                    Измените данные своего аккаунта.
                  </p>
                </Stack>

                <Stack className="gap-4">
                  <Stack className="gap-1.5">
                    <label
                      htmlFor="displayName"
                      className="text-sm font-medium"
                    >
                      Отображаемое имя
                    </label>
                    <Input
                      id="displayName"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                    />
                  </Stack>
                  <Stack className="gap-1.5">
                    <label htmlFor="password" className="text-sm font-medium">
                      Новый пароль
                    </label>
                    <Input
                      id="password"
                      placeholder="Оставьте пустым, чтобы не менять"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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

                {updateProfileMutation.error && (
                  <p className="text-sm text-red-500">
                    {updateProfileMutation.error.message}
                  </p>
                )}

                <Row className="items-center justify-end gap-4">
                  <p className="text-sm text-secondary">
                    После изменения данных нужно будет войти повторно.
                  </p>
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending
                      ? "Сохранение..."
                      : "Сохранить"}
                  </Button>
                </Row>
              </Stack>
            </form>
          </Paper>
        </Container>
      </ProtectedLayout>
    </>
  )
}
