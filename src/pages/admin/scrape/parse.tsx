import Head from "next/head"
import React, { useState } from "react"

import DefaultLayout from "@/layouts/DefaultLayout"
import { Button, Container, Paper, Stack } from "@/ui"
import { api } from "@/utils/api"
import type { ParsedQBlock } from "@/server/services/scraper"
import { Markdown } from "@/components/Markdown"

export default function ScrapeParsePage() {
  const [html, setHtml] = useState("")
  const [parsedQBlock, setParsedQBlock] = useState<ParsedQBlock | null>(null)

  const parseMutation = api.scraper.parseQBlock.useMutation({
    onSuccess: (data) => setParsedQBlock(data),
  })

  const handleParse = () => {
    parseMutation.mutate({ html })
  }

  return (
    <>
      <Head>
        <title>Parse Single QBlock</title>
      </Head>
      <DefaultLayout>
        <Container>
          <Stack className="gap-6">
            <Stack>
              <h1 className="text-2xl font-bold">Parse Single QBlock</h1>
              <p className="mt-1 text-secondary">
                Paste a FIPI question qblock to test the parser.
              </p>
            </Stack>
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              rows={15}
              className="w-full rounded-md border border-input bg-input px-3 py-2 font-mono text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder='<div class="qblock">...</div>'
            />
            <div className="flex justify-start">
              <Button
                onClick={handleParse}
                disabled={!html.trim() || parseMutation.isPending}
              >
                {parseMutation.isPending ? "Parsing..." : "Parse"}
              </Button>
            </div>

            {parsedQBlock && (
              <Paper>
                <h2 className="text-lg font-bold">Result</h2>
                {parseMutation.isPending && <p className="mt-4">Loading...</p>}
                {parseMutation.error && (
                  <p className="mt-4 text-red-500">
                    Error: {parseMutation.error.message}
                  </p>
                )}
                {parsedQBlock === null &&
                  !parseMutation.isPending &&
                  !parseMutation.error && (
                    <p className="mt-4">
                      Could not parse qblock. Make sure the HTML is valid.
                    </p>
                  )}
                {parsedQBlock && (
                  <>
                    <Markdown>{parsedQBlock.body}</Markdown>
                    <pre className="mt-4 overflow-x-auto rounded bg-muted p-4 text-sm">
                      {JSON.stringify(parsedQBlock, null, 2)}
                    </pre>
                  </>
                )}
              </Paper>
            )}
          </Stack>
        </Container>
      </DefaultLayout>
    </>
  )
}
