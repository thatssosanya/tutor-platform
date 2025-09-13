import React, { type PropsWithChildren } from "react"
import { Stack } from "./Stack"

function LabelBoxComponent({
  label,
  children,
}: PropsWithChildren<{ label: string }>) {
  return (
    <Stack as="label" className="gap-2">
      <p className="text-sm font-medium text-secondary">{label}</p>
      {children}
    </Stack>
  )
}

export const LabelBox = React.memo(LabelBoxComponent)
