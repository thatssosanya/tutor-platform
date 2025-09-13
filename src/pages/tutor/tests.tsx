import { ExternalLink, Trash2 } from "lucide-react"
import Head from "next/head"
import React from "react"

import { TestDetailView } from "@/components/tests/TestDetailView"
import { TestListView } from "@/components/tests/TestListView"
import { useQueryParam } from "@/hooks/useQueryParam"
import ProtectedLayout from "@/layouts/ProtectedLayout"
import { Button, Container } from "@/ui"
import { api } from "@/utils/api"
import { PermissionBit } from "@/utils/permissions"

export default function TutorTestsPage() {
  const [activeTestId, setActiveTestId] = useQueryParam("testId")
  const utils = api.useUtils()

  const deleteTestMutation = api.test.delete.useMutation({
    onSuccess: () => {
      utils.test.getAllBySubject.invalidate()
    },
  })

  const handleDelete = (testId: string) => {
    if (window.confirm("Вы уверены, что хотите удалить этот тест?")) {
      deleteTestMutation.mutate({ id: testId })
    }
  }

  const testCardControls = (testId: string) => (
    <>
      <Button
        size="sm"
        variant="primary-paper"
        onClick={() => setActiveTestId(testId)}
      >
        <ExternalLink className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="primary-paper"
        onClick={() => handleDelete(testId)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </>
  )

  return (
    <>
      <Head>
        <title>Управление тестами</title>
      </Head>
      <ProtectedLayout permissionBits={[PermissionBit.TUTOR]}>
        <Container>
          {activeTestId ? (
            <TestDetailView
              testId={activeTestId}
              onBack={() => setActiveTestId(null)}
            />
          ) : (
            <TestListView
              cardControls={testCardControls}
              isCreateAllowed={true}
            />
          )}
        </Container>
      </ProtectedLayout>
    </>
  )
}
