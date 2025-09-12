import React from "react"
import { useSubjectFilter } from "@/hooks/useSubjectFilter"
import { Stack } from "@/ui"
import { api } from "@/utils/api"
import { StudentsList } from "./StudentsList"
import { StudentsViewFilters } from "./StudentsViewFilters"
import { StudentCreateForm } from "./StudentCreateForm"

type StudentsListViewProps = {
  cardControls: (studentId: string) => React.ReactNode
  isCreateAllowed?: boolean
  onCreate?: (studentId: string) => void
}

export function StudentsListView({
  cardControls,
  isCreateAllowed = false,
  onCreate,
}: StudentsListViewProps) {
  const { selectedSubjectId, onSelectedSubjectIdChange } = useSubjectFilter()
  const studentsQuery = api.user.getStudents.useQuery()

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
      <div className="md:col-span-1">
        <Stack className="gap-4">
          <Stack>
            <h1 className="text-2xl font-bold">Ученики</h1>
            <p className="mt-1 text-secondary">
              Управляйте аккаунтами ваших учеников.
            </p>
          </Stack>
          <hr className="border-input" />
          <StudentsViewFilters
            selectedSubjectId={selectedSubjectId}
            onSelectedSubjectIdChange={onSelectedSubjectIdChange}
          />
        </Stack>
      </div>
      <div className="md:col-span-3">
        <Stack className="gap-4">
          <StudentsList
            students={studentsQuery.data ?? []}
            isLoading={studentsQuery.isLoading}
            cardControls={cardControls}
          />
          <StudentCreateForm
            isCreateAllowed={isCreateAllowed}
            onCreate={onCreate}
          />
        </Stack>
      </div>
    </div>
  )
}
