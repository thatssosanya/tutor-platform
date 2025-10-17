import remarkMath from "remark-math"
import ReactMarkdown from "react-markdown"
import rehypeKatex from "rehype-katex"
import remarkGfm from "remark-gfm"
import React from "react"
import "katex/dist/katex.min.css"
import { fixMarkdown } from "@/utils/markdown"

function MarkdownComponent({ children }: { children: string | null }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath, remarkGfm]}
      rehypePlugins={[rehypeKatex]}
      components={{
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        h1: ({ node, ...rest }) => {
          return <h1 className="text-[1.2em] py-2" {...rest} />
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        table: ({ node, ...rest }) => {
          return <table className="my-2" {...rest} />
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        td: ({ node, ...rest }) => {
          return <td className="p-2 border-1 border-primary" {...rest} />
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        p: ({ node, ...rest }) => {
          return <p className="my-1 first:mt-0 last:mb-0" {...rest} />
        },
        img: ({ node, ...rest }) => {
          return <img className="inline-block" {...rest} />
        },
      }}
    >
      {fixMarkdown(children)}
    </ReactMarkdown>
  )
}

export const Markdown = React.memo(MarkdownComponent)
