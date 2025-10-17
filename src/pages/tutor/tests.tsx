import { Transition } from "@headlessui/react"
import { ExternalLink, Trash2 } from "lucide-react"
import Head from "next/head"
import React from "react"

import { TestDetailView } from "@/components/tests/TestDetailView"
import { TestListView } from "@/components/tests/TestListView"
import { useQueryParam } from "@/hooks/useQueryParam"
import ProtectedLayout from "@/layouts/ProtectedLayout"
import { Button, Container } from "@/ui"
import { api, type RouterOutputs } from "@/utils/api"
import { PermissionBit } from "@/utils/permissions"

type Test = RouterOutputs["test"]["getAllBySubject"][number]

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

  const testCardControls = (test: Test) => (
    <>
      <Button
        size="sm"
        variant="primary-paper"
        onClick={() => setActiveTestId(test.id)}
      >
        <ExternalLink className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="primary-paper"
        onClick={() => handleDelete(test.id)}
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
        <Container className="overflow-x-hidden grid">
          <Transition
            show={!activeTestId}
            as="div"
            className="[grid-area:1/1] transition-transform duration-300 ease-out"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition-transform duration-300 ease-in"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <TestListView cardControls={testCardControls} allowCreate={true} />
          </Transition>
          <Transition
            show={!!activeTestId}
            as="div"
            className="[grid-area:1/1] transition-transform duration-300 ease-out"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="transition-transform duration-300 ease-in"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            {activeTestId && (
              <TestDetailView
                testId={activeTestId}
                onBack={() => setActiveTestId(null)}
              />
            )}
          </Transition>
        </Container>
      </ProtectedLayout>
    </>
  )
}
