import { QuestionMetaType } from "@prisma/client"
import React, { useMemo } from "react"

import { Button, CheckboxGroup, Dialog, Stack } from "@/ui"
import { api, type RouterOutputs } from "@/utils/api"
import { REPORT_OPTIONS } from "@/utils/consts"

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]

type ReportDialogProps = {
  isOpen: boolean
  onClose: () => void
  question: Question
}

export function ReportDialog({ isOpen, onClose, question }: ReportDialogProps) {
  const utils = api.useUtils()

  const updateMetaMutation = api.question.updateMeta.useMutation({
    onSuccess: () => {
      // TODO consider invalidating?
      // void utils.question.getPaginated.invalidate()
    },
  })

  const activeReports = useMemo(
    () =>
      question.metas
        .map((m) => m.type)
        .filter((t) =>
          (
            [
              QuestionMetaType.BODY_REPORT,
              QuestionMetaType.WORK_REPORT,
              QuestionMetaType.HINT_REPORT,
            ] as QuestionMetaType[]
          ).includes(t)
        ),
    [question.metas]
  )

  const handleReportsChange = (newReports: QuestionMetaType[]) => {
    const added = newReports.find((r) => !activeReports.includes(r))
    const removed = activeReports.find((r) => !newReports.includes(r))

    if (added) {
      updateMetaMutation.mutate({
        type: added,
        updates: { [question.id]: true },
      })
    } else if (removed) {
      updateMetaMutation.mutate({
        type: removed,
        updates: { [question.id]: false },
      })
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Сообщить об ошибке в вопросе #${question.name}`}
    >
      <Stack className="gap-6">
        <Stack className="gap-2">
          <p className="text-sm text-secondary">Выберите тип ошибки:</p>
          <CheckboxGroup
            variant="button"
            options={REPORT_OPTIONS}
            value={activeReports}
            onChange={handleReportsChange}
            disabled={updateMetaMutation.isPending}
          />
        </Stack>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </Stack>
    </Dialog>
  )
}
