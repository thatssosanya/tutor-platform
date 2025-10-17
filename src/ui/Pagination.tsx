import type { VariantProps } from "class-variance-authority"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import React from "react"

import { cn } from "@/styles"

import { Button, buttonVariants } from "./Button"
import { Row } from "./Row"

type PaginationProps = {
  currentPage: number
  totalPages: number | null | undefined
  onChangePage: (page: number) => void
  className?: string
  variant?: "ellipsis" | "all-pages"
  pageVariants?: Record<number, VariantProps<typeof buttonVariants>["variant"]>
}

const getPaginationItems = (currentPage: number, totalPages: number) => {
  const delta = 1
  const left = currentPage - delta
  const right = currentPage + delta + 1
  const range: number[] = []
  const rangeWithDots: (number | string)[] = []

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= left && i < right)) {
      range.push(i)
    }
  }

  let l: number | undefined
  for (const i of range) {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1)
      } else if (i - l !== 1) {
        rangeWithDots.push("...")
      }
    }
    rangeWithDots.push(i)
    l = i
  }

  return rangeWithDots
}

export function Pagination({
  currentPage,
  totalPages: totalPagesProp,
  onChangePage,
  className,
  variant = "ellipsis",
  pageVariants = {},
}: PaginationProps) {
  const totalPages = totalPagesProp ?? 1

  if (totalPages <= 1) {
    return null
  }

  if (variant === "all-pages") {
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    return (
      <Row className={cn("flex-wrap justify-center gap-1", className)}>
        {pages.map((page) => (
          <Button
            key={page}
            size="sm"
            variant={
              pageVariants[page] ??
              (page === currentPage ? "primary" : "secondary")
            }
            onClick={() => onChangePage(page)}
            className="min-w-[36px]"
          >
            {page}
          </Button>
        ))}
      </Row>
    )
  }

  const paginationItems = getPaginationItems(currentPage, totalPages)
  const canGoBack = currentPage > 1
  const canGoForward = currentPage < totalPages

  return (
    <Row className={cn("gap-1", className)}>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => onChangePage(1)}
        disabled={!canGoBack}
        aria-label="First page"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => onChangePage(currentPage - 1)}
        disabled={!canGoBack}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {paginationItems.map((item, index) =>
        typeof item === "string" ? (
          <span key={`dots-${index}`} className="px-3 py-1.5 text-secondary">
            {item}
          </span>
        ) : (
          <Button
            key={item}
            size="sm"
            variant={
              pageVariants[item] ??
              (item === currentPage ? "primary" : "secondary")
            }
            onClick={() => onChangePage(item)}
          >
            {item}
          </Button>
        )
      )}

      <Button
        size="sm"
        variant="secondary"
        onClick={() => onChangePage(currentPage + 1)}
        disabled={!canGoForward}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => onChangePage(totalPages)}
        disabled={!canGoForward}
        aria-label="Last page"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </Row>
  )
}
