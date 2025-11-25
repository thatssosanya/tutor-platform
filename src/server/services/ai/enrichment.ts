import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import z from "zod"

import { env } from "@/env"
import {
  extractInlineImageUrls,
  getExampleMessages, // <--- IMPORT THIS
  GRADE_MARKER,
  INLINE_IMAGE_REGEX,
  renderImageMessageParts,
  renderMultiOptions,
  SOLUTION_TYPE_INSTRUCTION_MARKER,
  SOLUTION_TYPE_INSTRUCTIONS,
  SYSTEM_PROMPT,
} from "@/server/lib/ai"
import type { RouterOutputs } from "@/utils/api"
import { fixHangingDollarSignDelimiters } from "@/utils/latex"

const openai = new OpenAI({
  apiKey: env.ENRICHMENT_AI_API_KEY,
  baseURL: "https://api.aitunnel.ru/v1/",
})

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]
type EnrichQuestionInput = Pick<
  Question,
  "body" | "solutionType" | "subject" | "options"
> & {
  attachments?: { url: string }[]
}

const enrichQuestionResponseSchema = z.object({
  work: z.string().nullable(),
  solution: z.string().nullable(),
  hint: z.string().nullable(),
})
type EnrichQuestionResponse = Partial<
  z.infer<typeof enrichQuestionResponseSchema>
>

export async function enrichQuestionWithAI(
  question: EnrichQuestionInput
): Promise<EnrichQuestionResponse> {
  const defaultReturn = { work: undefined, solution: undefined }

  if (!question.body) {
    return defaultReturn
  }

  const systemPrompt = SYSTEM_PROMPT.replaceAll(
    SOLUTION_TYPE_INSTRUCTION_MARKER,
    SOLUTION_TYPE_INSTRUCTIONS[question.solutionType] ?? ""
  ).replaceAll(GRADE_MARKER, question.subject.grade ?? "11")

  const inlineImageUrls = extractInlineImageUrls([
    question.body,
    ...question.options.map((o) => o.body),
  ])
  const imageMessageParts = await renderImageMessageParts([
    ...inlineImageUrls,
    ...(question.attachments?.map((a) => a.url) ?? []),
  ])

  const options = renderMultiOptions(question.options, question.solutionType)

  const exampleMessages = await getExampleMessages(question.solutionType)

  const maxRetries = 3
  const initialDelay = 1000

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: systemPrompt,
    },
    ...exampleMessages,
    {
      role: "user" as const,
      content: [
        {
          type: "text" as const,
          text:
            question.body.replaceAll(INLINE_IMAGE_REGEX, (_, g1) => g1) +
            options,
        },
        ...imageMessageParts,
      ],
    },
  ]

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        messages: messages,
        response_format: zodResponseFormat(
          enrichQuestionResponseSchema,
          "json_schema"
        ),
        max_completion_tokens: 4096,
        model: "grok-4.1-fast",
        temperature: 0.2,
        // @ts-expect-error TODO add openai.d.ts
        reasoning: {
          effort: "medium",
        },
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error("AI enrichment failed: No content in response.")
      }
      const parsed = JSON.parse(content) as EnrichQuestionResponse

      const result = {
        work: fixHangingDollarSignDelimiters(
          parsed.work
            ?.replaceAll("\\\\", "\\")
            ?.replaceAll("LATEXSTART", "$")
            ?.replaceAll("LATEXEND", "$")
            ?.replaceAll("\\frac", "\\dfrac")
            ?.replace(/^Ответ:.*$/m, "") ?? null
        ),
        solution: parsed.solution ?? null,
        hint: fixHangingDollarSignDelimiters(
          parsed.hint
            ?.replaceAll("\\\\", "\\")
            ?.replaceAll("LATEXSTART", "$")
            ?.replaceAll("LATEXEND", "$")
            ?.replaceAll("\\frac", "\\dfrac") ?? null
        ),
      }
      return result
    } catch (error) {
      if (attempt === maxRetries - 1) {
        console.error("An error occurred during AI question enrichment:", error)
        return defaultReturn
      }

      const delay = initialDelay * 2 ** attempt + Math.random() * 1000
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  return defaultReturn
}
