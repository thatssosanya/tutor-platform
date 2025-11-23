import "katex/dist/katex.min.css"

import React from "react"
import ReactMarkdown from "react-markdown"
import rehypeKatex from "rehype-katex"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"

import { cn } from "@/styles"
import { fixMarkdown } from "@/utils/markdown"

function MarkdownComponent({
  children,
  highlightImages,
}: {
  children: string | null
  highlightImages?: boolean
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath, remarkGfm]}
      rehypePlugins={[rehypeKatex]}
      components={{
        h1: ({ node: _, ...rest }) => {
          return <h1 className="text-[1.2em] py-2" {...rest} />
        },
        table: ({ node: _, ...rest }) => {
          return <table className="my-2" {...rest} />
        },
        td: ({ node: _, ...rest }) => {
          return <td className="p-2 border-1 border-primary" {...rest} />
        },
        p: ({ node: _, ...rest }) => {
          return <p className="my-1 first:mt-0 last:mb-0" {...rest} />
        },
        img: ({ node: _, ...rest }) => {
          return (
            <img
              className={cn(
                "inline-block",
                highlightImages && "rounded border-2 border-accent"
              )}
              {...rest}
            />
          )
        },
      }}
    >
      {fixMarkdown(children)}
    </ReactMarkdown>
  )
}

export const Markdown = React.memo(MarkdownComponent)
