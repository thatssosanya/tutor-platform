import { Loader2 } from "lucide-react"
import React from "react"

import { cn } from "@/styles"

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2 className={cn("h-8 w-8 animate-spin text-primary", className)} />
  )
}
