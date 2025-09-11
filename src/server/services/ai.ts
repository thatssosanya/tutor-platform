import { env } from "@/env"
import { SolutionType, type Question } from "@prisma/client"
import OpenAI from "openai"
import z from "zod"
import { zodResponseFormat } from "openai/helpers/zod"

const openai = new OpenAI({
  apiKey: env.ENRICHMENT_AI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
})

type EnrichQuestionInput = Pick<Question, "body" | "solutionType">

const enrichQuestionResponseSchema = z.object({
  work: z.string(),
  solution: z.string(),
})
type EnrichQuestionResponse = z.infer<typeof enrichQuestionResponseSchema>

const solutionTypeInstructions: Record<string, string> = {
  [SolutionType.SHORT]:
    'Поле "solution" должно быть строкой, содержащей только одно число или слово.',
  [SolutionType.LONG]:
    'Поле "solution" должно содержать подробный текстовый ответ.',
  [SolutionType.MULTICHOICE]:
    'Поле "solution" должно содержать номер правильного варианта ответа.',
  [SolutionType.MULTIRESPONSE]:
    'Поле "solution" должно содержать последовательность номеров правильных вариантов ответа без пробелов и разделителей.',
  [SolutionType.MULTICHOICEGROUP]:
    'Поле "solution" должно содержать последовательность номеров для каждой группы без пробелов и разделителей.',
}

const SYSTEM_PROMPT = `Ты — экспертный ИИ-ассистент для образовательной платформы.
Твоя задача — решить предложенную задачу из экзамена способом, доступным для ученика 11 класса,
и объяснить свое решение таким образом, чтобы помочь ученику 11 класса понять, как решать такие задачи.
Предоставь подробное, пошаговое решение в поле "work". Структурируй решение с чёткими шагами — "# Шаг 1:...", "# Шаг 2:..." и т.д.
В поле work можно использовать несколько rich text опций:
заголовки (строка начинается с #);
курсив (сегмент начинается с * заканчивается *);
жирный текст (сегмент начинается с ** и заканчивается **);
latex (сегмент начинается с $ и заканчивается $) — не забывай использовать \\ где положено в latex;
используй latex для специальных символов, например, \\angle для символа угла и ^{\\circ} для символа градуса;
если какой-либо специальный символ не существует в стандартной имплементации latex, но встречается в тексте задачи, используй его так же, как он используется в тексте задачи
Твое решение должно уложиться в 3000 слов (токенов).
Предоставь конечный результат в поле "solution".`

export async function enrichQuestionWithAI(
  question: EnrichQuestionInput
): Promise<EnrichQuestionResponse> {
  const defaultReturn = { work: "", solution: "" }

  if (!question.body) {
    return defaultReturn
  }

  const systemPrompt = [
    SYSTEM_PROMPT,
    solutionTypeInstructions[question.solutionType],
  ].join("\n")

  try {
    const response = await openai.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: "Твоя задача:\n```\n" + question.body + "\n```",
        },
      ],
      temperature: 0,
      max_completion_tokens: 8192,
      // @ts-expect-error TODO add openai.d.ts
      extra_body: {
        google: {
          thinking_config: {
            thinking_budget: 4096,
            include_thoughts: false,
          },
        },
      },
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
      work: parsed.work ?? "",
      solution: parsed.solution ?? "",
    }
  } catch (error) {
    console.error("An error occurred during AI question enrichment:", error)
    return defaultReturn
  }
}
