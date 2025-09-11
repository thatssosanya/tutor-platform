import React from "react"

import { Input, Stack } from "@/ui"

type SearchFilterProps = {
  search: string
  onSearchChange: (value: string) => void
}

export function SearchFilter({ search, onSearchChange }: SearchFilterProps) {
  return (
    <Stack className="gap-2" as="label">
      <p className="text-sm">Поиск</p>
      <Input
        placeholder="По названию, тексту..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </Stack>
  )
}
