import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import z from "zod"

import { env } from "@/env"
import {
  EXAMPLES,
  extractInlineImageUrls,
  GRADE_MARKER,
  INLINE_IMAGE_REGEX,
  renderImageMessageParts,
  renderMultiOptions,
  SOLUTION_TYPE_INSTRUCTION_MARKER,
  SOLUTION_TYPE_INSTRUCTIONS,
  SYSTEM_PROMPT,
} from "@/server/lib/ai"
import type { RouterOutputs } from "@/utils/api"

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

  const examples = EXAMPLES[question.solutionType]

  const maxRetries = 3
  const initialDelay = 1000

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: systemPrompt,
    },
    ...(
      await Promise.all(
        examples.map(async (example) => [
          {
            role: "user" as const,
            content: [
              { type: "text" as const, text: example.question },
              ...("imageUrls" in example && !!example.imageUrls
                ? await renderImageMessageParts(example.imageUrls)
                : []),
            ],
          },
          {
            role: "assistant" as const,
            content: [{ type: "text" as const, text: example.response }],
          },
        ])
      )
    ).flat(),
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

  console.dir(messages, { depth: null })

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: messages,
        temperature: 0,
        // @ts-expect-error TODO add openai.d.ts
        reasoning: {
          effort: "medium",
        },
        max_completion_tokens: 8192,
        response_format: zodResponseFormat(
          enrichQuestionResponseSchema,
          "json_schema"
        ),
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error("AI enrichment failed: No content in response.")
      }
      const parsed = JSON.parse(content) as EnrichQuestionResponse

      const result = {
        work:
          parsed.work
            ?.replaceAll("\\\\", "\\")
            ?.replaceAll("\\n", "\n")
            ?.replaceAll("LATEXSTART", "$")
            ?.replaceAll("LATEXEND", "$")
            ?.replaceAll("\\frac", "\\dfrac")
            ?.replace(/^Ответ:.*$/m, "") ?? null,
        solution: parsed.solution ?? null,
        hint:
          parsed.hint
            ?.replaceAll("\\\\", "\\")
            ?.replaceAll("\\n", "\n")
            ?.replaceAll("LATEXSTART", "$")
            ?.replaceAll("LATEXEND", "$")
            ?.replaceAll("\\frac", "\\dfrac") ?? null,
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
