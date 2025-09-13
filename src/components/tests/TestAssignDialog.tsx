import React, { useMemo, useState } from "react"

import {
  Button,
  DatePicker,
  Dialog,
  DialogFooter,
  Listbox,
  type ListboxOptionType,
  Stack,
} from "@/ui"
import { api, type RouterOutputs } from "@/utils/api"
import { parseDateString } from "@/utils/date"

type Student = RouterOutputs["user"]["getStudents"][number]

type TestAssignDialogProps = {
  isOpen: boolean
  onClose: () => void
  testId: string
  allStudents: Student[]
}

export function TestAssignDialog({
  isOpen,
  onClose,
  testId,
  allStudents,
}: TestAssignDialogProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null
  )
  const [dueDate, setDueDate] = useState("")

  const utils = api.useUtils()
  const createAssignmentMutation = api.assignment.create.useMutation({
    onSuccess: async () => {
      await utils.assignment.getByTestIdWithStudent.invalidate({ testId })
      handleClose()
    },
  })

  const handleClose = () => {
    setSelectedStudentId(null)
    setDueDate("")
    onClose()
  }

  const handleSave = () => {
    if (!selectedStudentId) return
    createAssignmentMutation.mutate({
      testId,
      assignedToId: selectedStudentId,
      dueAt: dueDate ? (parseDateString(dueDate) ?? undefined) : undefined,
    })
  }

  const studentOptions = useMemo(() => {
    return allStudents.map((s) => ({ value: s.id, label: s.displayName }))
  }, [allStudents])

  const selectedStudentOption =
    studentOptions.find((o) => o.value === selectedStudentId) ?? null

  const onStudentChange = (option: ListboxOptionType<string>) => {
    setSelectedStudentId(option.value)
  }

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="Новое задание">
      <Stack className="mt-4 gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Stack className="gap-2">
            <label className="text-sm font-medium">Ученик</label>
            <Listbox
              options={studentOptions}
              value={selectedStudentOption}
              onChange={onStudentChange}
              placeholder="Выберите ученика"
            />
          </Stack>
          <Stack className="gap-2">
            <label className="text-sm font-medium">Срок сдачи</label>
            <DatePicker
              value={dueDate}
              onChange={setDueDate}
              placeholder="ДД.ММ (необязательно)"
            />
          </Stack>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={handleClose}>
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedStudentId || createAssignmentMutation.isPending}
          >
            {createAssignmentMutation.isPending ? "Сохранение..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </Stack>
    </Dialog>
  )
}
