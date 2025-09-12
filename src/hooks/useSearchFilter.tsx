import { useState } from "react"

export function useSearchFilter() {
  const [search, setSearch] = useState("")
  return { search, onSearchChange: setSearch }
}
