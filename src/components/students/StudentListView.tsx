import { useSubjectFilter } from "@/hooks/useSubjectFilter"
import React from "react"
import { api } from "@/utils/api"
import { Stack } from "@/ui"
import { StudentCreateForm } from "./StudentCreateForm"
import { StudentList } from "./StudentList"
import { SubjectFilter } from "../filters/SubjectFilter"

type StudentListViewProps = {
  cardControls: (studentId: string) => React.ReactNode
  isCreateAllowed?: boolean
}

export function StudentListView({
  cardControls,
  isCreateAllowed = false,
}: StudentListViewProps) {
  const { selectedSubjectId, onSelectedSubjectIdChange } = useSubjectFilter({
    isStorageSyncEnabled: true,
    isQueryParamSyncEnabled: true,
  })
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
          <SubjectFilter
            selectedSubjectId={selectedSubjectId}
            onSelectedSubjectIdChange={onSelectedSubjectIdChange}
          />
        </Stack>
      </div>
      <div className="md:col-span-3">
        <Stack className="gap-4">
          <StudentList
            students={studentsQuery.data ?? []}
            isLoading={studentsQuery.isLoading}
            cardControls={cardControls}
          />
          <StudentCreateForm isCreateAllowed={isCreateAllowed} />
        </Stack>
      </div>
    </div>
  )
}
