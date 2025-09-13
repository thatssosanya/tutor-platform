import { ExternalLink, Trash2 } from "lucide-react"
import { useSession } from "next-auth/react"
import Head from "next/head"
import React from "react"
import { Transition } from "@headlessui/react"

import { QuestionDetailView } from "@/components/questions/QuestionDetailView"
import { QuestionListView } from "@/components/questions/QuestionListView"
import { useQueryParam } from "@/hooks/useQueryParam"
import ProtectedLayout from "@/layouts/ProtectedLayout"
import { Button, Container, Row } from "@/ui"
import { api, type RouterOutputs } from "@/utils/api"
import { PermissionBit } from "@/utils/permissions"

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]

export default function TutorQuestionsPage() {
  const [activeQuestionId, setActiveQuestionId] = useQueryParam("questionId")
  const { data: session } = useSession()
  const utils = api.useUtils()

  const deleteMutation = api.question.delete.useMutation({
    onSuccess: () => {
      utils.question.getPaginated.invalidate()
    },
  })

  const handleDelete = (questionId: string) => {
    if (window.confirm("Вы уверены, что хотите удалить этот вопрос?")) {
      deleteMutation.mutate({ id: questionId })
    }
  }

  const questionCardControls = (question: Question) => (
    <Row className="items-center gap-2">
      <Button
        size="sm"
        variant="primary-paper"
        onClick={() => setActiveQuestionId(question.id)}
      >
        <ExternalLink className="h-4 w-4" />
      </Button>
      {question.creatorId === session?.user?.id && (
        <Button
          size="sm"
          variant="primary-paper"
          onClick={() => handleDelete(question.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </Row>
  )

  return (
    <>
      <Head>
        <title>Управление вопросами</title>
      </Head>
      <ProtectedLayout permissionBits={[PermissionBit.TUTOR]}>
        <Container className="overflow-x-hidden grid">
          <Transition
            show={!activeQuestionId}
            as="div"
            className="[grid-area:1/1] transition-transform duration-300 ease-out"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition-transform duration-300 ease-in"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <QuestionListView
              cardControls={questionCardControls}
              isCreateAllowed={true}
            />
          </Transition>

          <Transition
            show={!!activeQuestionId}
            as="div"
            className="[grid-area:1/1] transition-transform duration-300 ease-out"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="transition-transform duration-300 ease-in"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            {activeQuestionId && (
              <QuestionDetailView
                questionId={activeQuestionId}
                onBack={() => setActiveQuestionId(null)}
              />
            )}
          </Transition>
        </Container>
      </ProtectedLayout>
    </>
  )
}
