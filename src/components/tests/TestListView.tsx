import React from "react"

import { useSubjectFilter } from "@/hooks/filters/useSubjectFilter"
import { Stack } from "@/ui"
import { api, type RouterOutputs } from "@/utils/api"

import { SubjectFilter } from "../filters/SubjectFilter"
import { TestCreateForm } from "./TestCreateForm"
import { TestList } from "./TestList"

type Test = RouterOutputs["test"]["getAllBySubject"][number]

type TestListViewProps = {
  cardControls: (test: Test) => React.ReactNode
  allowCreate?: boolean
}

export function TestListView({
  cardControls,
  allowCreate = false,
}: TestListViewProps) {
  const { selectedSubjectId, onSelectedSubjectIdChange } = useSubjectFilter({
    isStorageSyncEnabled: true,
    isQueryParamSyncEnabled: true,
  })

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
          <SubjectFilter
            selectedSubjectId={selectedSubjectId}
            onSelectedSubjectIdChange={onSelectedSubjectIdChange}
          />
        </Stack>
      </div>
      <div className="md:col-span-3">
        {selectedSubjectId ? (
          <Stack className="gap-4">
            <TestList
              tests={testsQuery.data ?? []}
              isLoading={testsQuery.isLoading}
              cardControls={cardControls}
            />
            {allowCreate && <TestCreateForm subjectId={selectedSubjectId} />}
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
