import { Check, ExternalLink } from "lucide-react"
import Head from "next/head"
import Link from "next/link"
import React, { useMemo } from "react"

import { SubjectFilter } from "@/components/filters/SubjectFilter"
import { TestList } from "@/components/tests/TestList"
import ProtectedLayout from "@/layouts/ProtectedLayout"
import { Button, Container, Stack } from "@/ui"
import { api, type RouterOutputs } from "@/utils/api"
import { PermissionBit } from "@/utils/permissions"
import { useSubjects } from "@/utils/subjects"

type Test =
  RouterOutputs["assignment"]["getStudentAssignmentsBySubject"][number]["test"] & {
    assignmentId?: string
  }

export default function StudentAssignmentsPage() {
  const { selectedSubjectId, setSelectedSubjectId } = useSubjects()

  const assignmentsQuery =
    api.assignment.getStudentAssignmentsBySubject.useQuery(
      { subjectId: selectedSubjectId! },
      { enabled: !!selectedSubjectId }
    )

  const tests = useMemo(() => {
    if (!assignmentsQuery.data) {
      return []
    }
    const tests = assignmentsQuery.data.map(({ test, ...assignment }) => ({
      ...test,
      assignmentId: assignment.id,
    }))
    return tests
  }, [assignmentsQuery.data])

  const cardControls = (test: Test) => {
    const assignment = assignmentsQuery.data?.find(
      (a) => a.id === test.assignmentId
    )
    if (!assignment) return null

    return (
      <Link href={`/student/assignments/${assignment.id}`}>
        <Button size="sm" variant="primary-paper">
          {assignment.completedAt ? (
            <Check className="h-4 w-4" />
          ) : (
            <ExternalLink className="h-4 w-4" />
          )}
        </Button>
      </Link>
    )
  }

  return (
    <>
      <Head>
        <title>Мои задания</title>
      </Head>
      <ProtectedLayout permissionBits={[PermissionBit.STUDENT]}>
        <Container>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div className="md:col-span-1">
              <Stack className="gap-8">
                <Stack>
                  <h1 className="text-2xl font-bold">Мои задания</h1>
                  <p className="mt-1 text-secondary">
                    Выберите предмет, чтобы начать.
                  </p>
                </Stack>
                <SubjectFilter
                  selectedSubjectId={selectedSubjectId}
                  onSelectedSubjectIdChange={setSelectedSubjectId}
                />
              </Stack>
            </div>
            <div className="md:col-span-3">
              {selectedSubjectId ? (
                <TestList
                  tests={tests}
                  isLoading={assignmentsQuery.isLoading}
                  cardControls={cardControls}
                />
              ) : (
                <p className="text-secondary">
                  Выберите предмет для просмотра заданий.
                </p>
              )}
            </div>
          </div>
        </Container>
      </ProtectedLayout>
    </>
  )
}
