import { Transition } from "@headlessui/react"
import Head from "next/head"
import React from "react"

import { QuestionDetailView } from "@/components/questions/QuestionDetailView"
import { QuestionListView } from "@/components/questions/QuestionListView"
import { useQueryParam } from "@/hooks/useQueryParam"
import ProtectedLayout from "@/layouts/ProtectedLayout"
import { Container } from "@/ui"
import { PermissionBit } from "@/utils/permissions"

export default function TutorQuestionsPage() {
  const [activeQuestionId, setActiveQuestionId] = useQueryParam("questionId")

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
            <QuestionListView allowCreate onSelect={setActiveQuestionId} />
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
