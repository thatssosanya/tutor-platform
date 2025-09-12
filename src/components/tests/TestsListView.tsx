import React from "react"

import { useSubjectFilter } from "@/hooks/useSubjectFilter"
import { Stack } from "@/ui"
import { api, type RouterOutputs } from "@/utils/api"
import { TestsList } from "./TestsList"
import { TestCreateForm } from "./TestCreateForm"
import { TestsViewFilters } from "./TestsViewFilters"

type Test = RouterOutputs["test"]["getAllBySubject"][number]

type TestsListViewProps = {
  cardControls: (testId: string) => React.ReactNode
  isCreateAllowed?: boolean
}

export function TestsListView({
  cardControls,
  isCreateAllowed = false,
}: TestsListViewProps) {
  const { selectedSubjectId, onSelectedSubjectIdChange } = useSubjectFilter()

  const testsQuery = api.test.getAllBySubject.useQuery(
    { subjectId: selectedSubjectId! },
    { enabled: !!selectedSubjectId }
  )

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
      <div className="md:col-span-1">
        <Stack className="gap-4">
          <Stack>
            <h1 className="text-2xl font-bold">Тесты</h1>
            <p className="mt-1 text-secondary">
              Управляйте вашими тестами и заданиями.
            </p>
          </Stack>
          <hr className="border-input" />
          <TestsViewFilters
            selectedSubjectId={selectedSubjectId}
            onSelectedSubjectIdChange={onSelectedSubjectIdChange}
          />
        </Stack>
      </div>
      <div className="md:col-span-3">
        {selectedSubjectId ? (
          <Stack className="gap-4">
            <TestsList
              tests={testsQuery.data ?? []}
              isLoading={testsQuery.isLoading}
              cardControls={cardControls}
            />
            {isCreateAllowed && (
              <TestCreateForm subjectId={selectedSubjectId} />
            )}
          </Stack>
        ) : (
          <p className="text-secondary">
            Выберите предмет для просмотра тестов.
          </p>
        )}
      </div>
    </div>
  )
}
