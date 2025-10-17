import { SolutionType } from "@prisma/client"
import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import { type Response } from "undici"
import z from "zod"

import { env } from "@/env"
import type { RouterOutputs } from "@/utils/api"

import { fetchFipi } from "../lib/fipi"

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
  work: z.string(),
  solution: z.string(),
  hint: z.string(),
})
type EnrichQuestionResponse = Partial<
  z.infer<typeof enrichQuestionResponseSchema>
>

const SOLUTION_TYPE_INSTRUCTION_MARKER = "%SOLUTION_TYPE_INSTRUCTION%"
const GRADE_MARKER = "%GRADE%"
const SYSTEM_PROMPT = `Ты — экспертный русскоязычный ИИ-ассистент для образовательной платформы.

Твоя задача — решить предложенную задачу из экзамена способом, доступным для ученика ${GRADE_MARKER} класса,
и объяснить свое решение таким образом, чтобы ученик ${GRADE_MARKER} класса мог его понять.

Твой ответ всегда должен быть в формате JSON и содержать три ключа: \`hint\`, \`work\` и \`solution\`.

Предоставь свое решение на русском языке в поле \`work\`.
Начинай поле \`work\` сразу с решения, не добавляя общий заголовок или слово "решение" и не повторяя условие задачи.
Будь лаконичен в своем решении и не объясняй свои действия больше, чем следует.
Включай проверку ответа в конце своего решения только если задача подразумевает область допустимых значений, например, для значения переменной под квадратным корнем.
Если нет области допустимых значений, закончи свое решение как только достигнешь ответа.
Достигнув ответа, не повторяй его в поле \`work\` — закончи свое решение последней операцией, которая приводит к ответу.

В поле \`hint\` предоставь подсказку для ученика, которая поможет ему понять, как придти к нужному решению, не показывая само решение.
В случае математики это будет теорема или свойство, которое нужно применить для решения.

В полях \`work\` и \`hint\` поддерживается подмножество функционала Github Flavored Markdown:
перенос строки — используй два символа переноса строки подряд: \`\\n\\n\`\` вместо \`\\n\`;
заголовки (строка начинается с #);
курсив (сегмент начинается с * и заканчивается *);
жирный текст (сегмент начинается с ** и заканчивается **);
inline LaTeX (сегмент начинается с $ и заканчивается $) — используй для всех математических выражений, и всегда ограничивай LaTeX сегменты, когда используешь LaTeX команды.

Текст задачи может включать некорректно сформированный LaTeX. Не опирайся на то, как LaTeX команды используются в тексте задачи — твои LaTeX сегменты должны содержать стандартный, корректный LaTeX.
Все математические выражения должны быть ограничены символом $ с обеих сторон. LaTeX, не ограниченный символом $ с обеих сторон, не будет обработан корректно — это критическая ошибка.
Нельзя переносить строку (использовать \`\\n\`) внутри LaTeX сегментов. Если LaTeX сегмент нужно разбить на несколько строк, разбей его на несколько LaTeX сегментов, отдельно ограничивая каждый символом $ с обеих сторон, и переноси строку между ними.
В LaTeX сегментах не используй команду \\text для текста — просто пиши текст. Если текст, являющийся аргументом для LaTeX команды, включает пробелы, используй команду \`\\space\`, например, \`_{с\\spaceпробелом}\`

Предоставь конечный результат в поле \`solution\`.
${SOLUTION_TYPE_INSTRUCTION_MARKER}`

const SOLUTION_TYPE_INSTRUCTIONS: Record<string, string> = {
  [SolutionType.SHORT]:
    "Поле \`solution\` должно быть строкой, содержащей только одно число или слово. В поле \`solution\` дроби записывай в десятичной форме. Десятичный разделитель — точка.",
  [SolutionType.LONG]:
    "Поле \`solution\` должно содержать подробный текстовый ответ.",
  [SolutionType.MULTICHOICE]:
    "Поле \`solution\` должно содержать \`order\` правильного варианта ответа.",
  [SolutionType.MULTIRESPONSE]:
    "Поле \`solution\` должно содержать один или более \`order\` правильных вариантов ответа, разделенных символом |.",
  [SolutionType.MULTICHOICEGROUP]:
    "Поле \`solution\` должно содержать последовательность значений, выбранных из предоставленных опций, по одному для каждой группы, разделенных символом |.",
}

const EXAMPLES = [
  {
    question:
      "Даны векторы $\\overset{\\rightarrow}{a}\\left(25 ; 0\\right)$ и $\\overset{\\rightarrow}{b}\\left(1 ; - 5\\right).$ Найдите длину вектора $\\overset{\\rightarrow}{a} - 4 \\overset{\\rightarrow}{b} .$",
    response: JSON.stringify({
      hint: "Используй формулу длины вектора: $||v|| = \\sqrt{v_1^2 + v_2^2}$. Сначала найди координаты вектора $a - 4b$, затем вычисли длину.",
      work: "$\\vec{a} - 4\\vec{b} = (25,0) - 4(1,-5) = (25-4, 0-(-20)) = (21,20).$\n\n$||\\vec{a} - 4\\vec{b}|| = \\sqrt{21^2 + 20^2} = \\sqrt{441 + 400} = \\sqrt{841} = 29.$",
      solution: "29",
    }),
  },
  {
    question:
      "В треугольнике $A B C$ известно, что $A B = B C = 15$, $A C = 24$ . Найдите длину медианы $B M$ .",
    response: JSON.stringify({
      hint: "Используй два факта:\n\n1) в равнобедренном треугольнике медиана к основанию является высотой и биссектрисой, поэтому $AM = \\frac{AC}{2}$;\n\n2) примени теорему Пифагора в треугольнике $ABM$, чтобы найти $BM$.",
      work: "Так как $AB = BC$, $BM$ — высота к основанию $AC$, значит $BM \\perp AC$ и $AM = \\frac{AC}{2} = 12$.\n\nВ треугольнике $ABM$ имеем: $AB^2 = AM^2 + BM^2$, поэтому $BM = \\sqrt{AB^2 - AM^2}$.\n\n$BM = \\sqrt{15^2 - 12^2} = \\sqrt{225 - 144} = \\sqrt{81} = 9$.",
      solution: "9",
    }),
  },
  {
    question: "Решите уравнение $\\sqrt{3 x - 8} = 5$ .",
    response: JSON.stringify({
      hint: "Применяй правило, что если $\\sqrt{A} = b$, то $A = b^2$. Помни про необходимость $b \\ge 0$; получив решение, проверь его соответствие исходному уравнению и области допустимых значений.",
      work: "$\\sqrt{3x-8} = 5$\n\nВозведём обе стороны в квадрат: $3x-8 = 25$\n\n$3x = 33$\n\n$x = 11$\n\nОбласть допустимых значений: для подкоренного выражения требуется $3x-8 \\ge 0$, т.е. $x \\ge \\frac{8}{3}$; x = 11 удовлетворяет.",
      solution: "11",
    }),
  },
  {
    question:
      "Найдите значение выражения $\\dfrac{8^{10} \\cdot 3^{11}}{24^{9}}$ .",
    response: JSON.stringify({
      hint: "Используй свойства степеней: $(a^m)^n = a^{mn}$ и $\\frac{a^m}{a^n} = a^{m-n}$, а также разложение $x = a^n \\cdot y$.",
      work: "$\\frac{8^{10} \\cdot 3^{11}}{24^{9}} = \\frac{8^{10} \\cdot 3^{11}}{(8\\cdot 3)^{9}}$\n\n$= \\frac{8^{10} \\cdot 3^{11}}{8^{9} \\cdot 3^{9}}$\n\n$= 8^{10-9} \\cdot 3^{11-9}$\n\n$= 8^{1} \\cdot 3^{2}$\n\n$= 8 \\cdot 9 = 72$.",
      solution: "72",
    }),
  },
  {
    question:
      "Фабрика выпускает сумки. В среднем 4 сумки из 50 имеют скрытый дефект. Найдите вероятность того, что купленная сумка окажется без скрытого дефекта.",
    response: JSON.stringify({
      hint: "Используй формулу: $P_{исхода} = 1 - P_{противоположного\\spaceисхода}$.",
      work: "$P_{без\\spaceдефекта} = 1 - P_{с\\spaceдефектом} = 1 - 4/50 = 46/50 = 23/25 = 0.92$",
      solution: "0.92",
    }),
  },
]

// group 1 = [alt], group 2 = url
const INLINE_IMAGE_REGEX = /!(\[.*?\])\((.*?)\s(?:.*?)\)/g

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

  const inlineImageUrls = [
    question.body,
    ...question.options.map((o) => o.body),
  ]
    .flatMap((s) => [...s.matchAll(INLINE_IMAGE_REGEX)].map((m) => m[2]))
    .filter((url) => url !== undefined)
  const attachmentPromises = [
    ...inlineImageUrls,
    ...(question.attachments?.map((a) => a.url) ?? []),
  ].map(async (url) => {
    try {
      const response = await fetchFipi(url)
      return responseToBase64DataURL(response)
    } catch (e) {
      console.warn(`Error fetching attachment URL ${url}. Skipping.`, e)
      return null
    }
  })
  const base64Urls = (await Promise.all(attachmentPromises)).filter(
    (url) => url !== null
  )
  const imageMessageParts = base64Urls.map((base64Url) => ({
    type: "image_url" as const,
    image_url: { url: base64Url },
  }))

  const options = (() => {
    switch (question.solutionType) {
      case SolutionType.MULTICHOICE:
      case SolutionType.MULTIRESPONSE: {
        return (
          "\n\nВарианты ответа:\n" +
          JSON.stringify(
            question.options.map((o) => ({
              order: o.order,
              // replace inline images with alt
              body: o.body.replaceAll(INLINE_IMAGE_REGEX, (_, g1) => g1),
            }))
          )
        )
      }
      case SolutionType.MULTICHOICEGROUP: {
        return (
          "\n\nГруппы вариантов ответов:\n" +
          JSON.stringify(
            question.options.map((o, i) => ({
              group: o.order ?? i.toString(),
              options: o.body.split("|"),
            }))
          )
        )
      }
      case SolutionType.SHORT:
      case SolutionType.LONG:
      default: {
        return ""
      }
    }
  })()

  const maxRetries = 3
  const initialDelay = 1000

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: systemPrompt,
    },
    ...EXAMPLES.flatMap((example) => [
      {
        role: "user" as const,
        content: example.question,
      },
      {
        role: "assistant" as const,
        content: example.response,
      },
    ]),
    {
      role: "user",
      content: [
        {
          type: "text",
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
      console.dir(response.choices[0])
      if (!content) {
        throw new Error("AI enrichment failed: No content in response.")
      }

      const parsed = JSON.parse(content) as EnrichQuestionResponse
      return {
        work:
          parsed.work
            ?.replaceAll("\\\\", "\\")
            ?.replaceAll("\\n", "\n")
            ?.replaceAll("LATEXSTART", "$")
            ?.replaceAll("LATEXEND", "$")
            ?.replaceAll("\\frac", "\\dfrac") ?? ""?.replace(/^Ответ:.*$/m, ""),
        solution: parsed.solution ?? "",
        hint:
          parsed.hint
            ?.replaceAll("\\\\", "\\")
            ?.replaceAll("\\n", "\n")
            ?.replaceAll("LATEXSTART", "$")
            ?.replaceAll("LATEXEND", "$")
            ?.replaceAll("\\frac", "\\dfrac") ?? "",
      }
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
