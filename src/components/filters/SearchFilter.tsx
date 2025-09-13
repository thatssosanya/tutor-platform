import React from "react"

import { Input } from "@/ui"

type SearchFilterProps = {
  search: string
  onSearchChange: (value: string) => void
}

export function SearchFilter({ search, onSearchChange }: SearchFilterProps) {
  return (
    <Input
      label="Поиск"
      placeholder="По названию, тексту..."
      value={search}
      onChange={(e) => onSearchChange(e.target.value)}
    />
  )
}
