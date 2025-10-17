import React, { type ElementType, type PropsWithChildren } from "react"

import { Stack } from "./Stack"

function LabelBoxComponent({
  label,
  labelAs = "label",
  children,
}: PropsWithChildren<{ label: string; labelAs?: ElementType }>) {
  return (
    <Stack as={labelAs} className="gap-2">
      <p className="text-sm font-medium text-secondary">{label}</p>
      {children}
    </Stack>
  )
}

export const LabelBox = React.memo(LabelBoxComponent)
