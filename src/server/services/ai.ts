import { env } from "@/env"
import { SolutionType, type Question } from "@prisma/client"
import OpenAI from "openai"
import z from "zod"
import { zodResponseFormat } from "openai/helpers/zod"
import { fetchFipi } from "../lib/fipi"
import { type Response } from "undici"

const openai = new OpenAI({
  apiKey: env.ENRICHMENT_AI_API_KEY,
  baseURL: "https://api.aitunnel.ru/v1/",
})

type EnrichQuestionInput = Pick<Question, "body" | "solutionType"> & {
  attachments?: { url: string }[]
}

const enrichQuestionResponseSchema = z.object({
  work: z.string(),
  solution: z.string(),
})
type EnrichQuestionResponse = Partial<
  z.infer<typeof enrichQuestionResponseSchema>
>

const solutionTypeInstructions: Record<string, string> = {
  [SolutionType.SHORT]:
    'Поле "solution" должно быть строкой, содержащей только одно число или слово. В поле "solution" дроби записывай в десятичной форме. Десятичный разделитель — точка.',
  [SolutionType.LONG]:
    'Поле "solution" должно содержать подробный текстовый ответ.',
  [SolutionType.MULTICHOICE]:
    'Поле "solution" должно содержать номер правильного варианта ответа.',
  [SolutionType.MULTIRESPONSE]:
    'Поле "solution" должно содержать последовательность номеров правильных вариантов ответа без пробелов и разделителей.',
  [SolutionType.MULTICHOICEGROUP]:
    'Поле "solution" должно содержать последовательность номеров для каждой группы без пробелов и разделителей.',
}

const SYSTEM_PROMPT = `Ты — экспертный русскоязычный ИИ-ассистент для образовательной платформы.

Твоя задача — решить предложенную задачу из экзамена способом, доступным для ученика 11 класса,
и объяснить свое решение таким образом, чтобы ученик 11 класса мог его понять.

Предоставь свое решение на русском языке в поле "work".
Начинай поле "work" сразу с решения, не добавляя общий заголовок или слово "решение" и не повторяя условие задачи.
Будь лаконичен в своем решении и не объясняй свои действия больше, чем следует.
Включай проверку ответа в конце своего решения только если задача подразумевает область допустимых значений, например, для значения переменной под квадратным корнем.
Если нет области допустимых значений, закончи свое решение как только достигнешь ответа.

Для переноса строки используй два символа переноса строки подряд — \\n\\n вместо \\n.

В поле "work" можно использовать несколько rich text опций:
заголовки (строка начинается с #);
курсив (сегмент начинается с * и заканчивается *);
жирный текст (сегмент начинается с ** и заканчивается **);
LaTeX (сегмент начинается с $ и заканчивается $) — используй для всех математических выражений, и всегда ограничивай LaTeX сегменты, когда используешь LaTeX команды.
Текст задачи может включать некорректно сформированный LaTeX. Не опирайся на то, как LaTeX команды используются в тексте задачи — твои LaTeX сегменты должны содержать стандартный, корректный LaTeX.
В LaTeX сегментах не используй команду \\text для текста — просто пиши текст.
LaTeX сегменты не могут содержать \\n. Разбивай LaTeX сегменты на несколько LaTeX сегментов, отдельно ограничивая каждый, если выражение нужно разбить на несколько строк.

Предоставь конечный результат в поле "solution".`

export async function enrichQuestionWithAI(
  question: EnrichQuestionInput
): Promise<EnrichQuestionResponse> {
  const defaultReturn = { work: undefined, solution: undefined }

  if (!question.body) {
    return defaultReturn
  }

  // 1. Prepare concurrent fetch promises
  const attachmentPromises = (question.attachments ?? []).map(async (a) => {
    try {
      const response = await fetchFipi(a.url)
      return responseToBase64DataURL(response)
    } catch (e) {
      console.warn(`Error fetching attachment URL ${a.url}. Skipping.`, e)
      return null
    }
  })

  const base64Urls = (await Promise.all(attachmentPromises)).filter(
    (url) => url !== null
  )

  const systemPrompt = [
    SYSTEM_PROMPT,
    solutionTypeInstructions[question.solutionType],
  ].join("\n")

  const imageMessageParts = base64Urls.map((base64Url) => ({
    type: "image_url" as const,
    image_url: { url: base64Url },
  }))

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Твоя задача:\n```\n" + question.body + "\n```",
            },
            ...imageMessageParts,
          ],
        },
      ],
      temperature: 0,
      // @ts-expect-error TODO add openai.d.ts
      reasoning: {
        effort: "medium",
      },
      max_tokens: 8192,
      response_format: zodResponseFormat(
        enrichQuestionResponseSchema,
        "json_schema"
      ),
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      console.error("AI enrichment failed: No content in response.")
      return defaultReturn
    }

    const parsed = JSON.parse(content) as EnrichQuestionResponse
    return {
      work:
        parsed.work
          ?.replaceAll("\\\\", "\\")
          ?.replaceAll("\\n", "\n")
          ?.replaceAll("LATEXSTART", "$")
          ?.replaceAll("LATEXEND", "$")
          ?.replaceAll("\\frac", "\\dfrac") ?? "",
      solution: parsed.solution ?? "",
    }
  } catch (error) {
    console.error("An error occurred during AI question enrichment:", error)
    return defaultReturn
  }
}

async function responseToBase64DataURL(
  response: Response
): Promise<string | null> {
  if (!response.ok) {
    console.error(
      `Failed to fetch attachment: ${response.status} ${response.statusText}`
    )
    return null
  }

  const contentType =
    response.headers.get("content-type") || "application/octet-stream"

  try {
    const buffer = await response.arrayBuffer()
    const base64 = Buffer.from(buffer).toString("base64")
    return `data:${contentType};base64,${base64}`
  } catch (e) {
    console.error("Error converting response to Base64:", e)
    return null
  }
}
