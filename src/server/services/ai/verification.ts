import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import z from "zod"

import { env } from "@/env"
import type { RouterOutputs } from "@/utils/api"

const openai = new OpenAI({
  apiKey: env.ENRICHMENT_AI_API_KEY,
  baseURL: "https://api.aitunnel.ru/v1/",
})

type Question = RouterOutputs["question"]["getPaginated"]["items"][number]

// issues is currently redundant but should help the model's responses
const verificationResponseSchema = z.object({
  issues: z.array(z.string()),
  correct: z.boolean(),
})

const SYSTEM_PROMPT = `Ты — автоматический валидатор синтаксиса (Linter) для математических текстов.
Твоя задача — проверить два текстовых поля (\`work\` и \`hint\`) на технические ошибки разметки и грубое неследование инструкции.

Ты проверяешь ТОЛЬКО форму, а не содержание. Контекст задачи тебе неизвестен. Фактическая правильность вычислений тебе не важна.

КРИТЕРИИ ВАЛИДАЦИИ:

1. **LaTeX (Критично)**:
  - Математические символы, переменные и формулы должны быть обернуты в \\$ (например, $x$, $2+2$, $\\frac{1}{2}$).
  - - Без LaTeX разрешаются простые арифметические выражения, в т.ч. с операциями +, -, /, \\*, а также специальные символы, например, ∠, ⟂ и т.д.
  - - LaTeX операторы, например, \\frac{1}{2}, не обернутые в $, являются критической ошибкой.
  - Внутри LaTeX (\\$...\\$) обычный текст (слова, а не переменные, операторы и т.д.), содержащий пробелы, должен быть обернут в \\text{} или использовать \\space для пробелов — оба варианта приемлемы. Обычный текст внутри LaTeX с обычными пробелами — критическая ошибка. Пробелы между переменными, операторами и т.д. — допустимая неточность и не считается ошибкой.
  - Поддерживается только inline LaTeX, поэтому внутри сегментов (\\$...\\$) не допускаются переносы строки (\`\n\`). Это критическая ошибка.
  - Проверяй парность скобок {}, [], () внутри LaTeX. Незакрытые скобки — критическая ошибка.

2. **Markdown**:
  - Markdown должен использоваться синтактически корректно, например, за \\# для заголовка должен следовать отступ, для курсива открывающие \\* должны быть закрыты.

3. **Следование инструкции**:
  - В некоторых случаях текст будет содержать такие заявления, как "Я не вижу картинку", "Изображение нечеткое", "Не могу решить". Это критическая ошибка.
  - Текст должен содержать только русский язык, за исключением установленных терминов, например, sin для синуса, log для логарифма, P для вероятности и т.д.
  Любое нежелательное использование других языков, например, "смежные углы в параллелограмме supplementary", является критической ошибкой.

Верни JSON:
- issues: список найденных технических ошибок.
- correct: false, если есть хотя бы одна ошибка. Иначе true.`

const EXAMPLES: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
  {
    role: "user",
    content: JSON.stringify({
      work: "Медиана равностороннего треугольника совпадает с высотой, поэтому $h = \\dfrac{\\sqrt{3}}{2} a$, где $a$ — сторона.\n\nС учетом, что $h = 9\\sqrt{3}$, получаем $9\\sqrt{3} = \\dfrac{\\sqrt{3}}{2} a$, отсюда $a = \\dfrac{2 \\cdot 9\\sqrt{3}}{\\sqrt{3}} = 18$.",
      hint: "У равностороннего треугольника медиана совпадает с высотой; высота равна $h = \\dfrac{\\sqrt{3}}{2} a$, где $a$ — сторона. Найди $a$ через данное значение $h$. ",
    }),
  },
  {
    role: "assistant",
    content: JSON.stringify({
      issues: [],
      correct: true,
    }),
  },

  {
    role: "user",
    content: JSON.stringify({
      work: "8.9 \\times 4.3 = (89/10) \\times (43/10) = (89 \\times 43)/100\n\n= 3827/100 = 38.27",
      hint: "Умножай как целые числа: 8.9 = 89/10, 4.3 = 43/10, затем раздели результат на 100 (два знака после запятой в произведении).",
    }),
  },
  {
    role: "assistant",
    content: JSON.stringify({
      issues: [
        'LaTeX операторы не обернуты в LaTeX ограничители $: "8.9 \\times 4.3 = (89/10) \\times (43/10) = (89 \\times 43)/100\n\n= 3827/100 = 38.27".',
      ],
      correct: false,
    }),
  },

  {
    role: "user",
    content: JSON.stringify({
      work: "Из 80 фонариков 12 неисправны, поэтому вероятность дефекта P(defect) = 12/80 = 3/20 = 0.15. Тогда вероятность исправного P(без дефекта) = 1 - P(defect) = 1 - 0.15 = 0.85.",
      hint: "Используй простое правило вероятности: вероятность события равна 1 минус вероятность противоположного события.",
    }),
  },
  {
    role: "assistant",
    content: JSON.stringify({
      issues: [
        'Несоблюдение инструкции: "defect" в P(defect) должно быть написано по-русски.',
      ],
      correct: false,
    }),
  },

  {
    role: "user",
    content: JSON.stringify({
      work: "Не могу увидеть изображения. Опиши текст неравенства и содержимое каждого варианта (например, какие точки или интервалы указаны в каждом изображении). Тогда я выберу правильный номер варианта и дам решение.",
      hint: "Чтобы выбрать верный вариант, нужно отдельно решить неравенство и затем сопоставить полученный набор значений с изображениями вариантов. Опиши текст неравенства и каждый из четырех вариантов.",
    }),
  },
  {
    role: "assistant",
    content: JSON.stringify({
      issues: ['Несоблюдение инструкции: "Не могу увидеть изображения".'],
      correct: false,
    }),
  },

  {
    role: "user",
    content: JSON.stringify({
      work: "Всего чашек = 20, из них синих = 10.\n\nP(синие) = 10/20 = 1/2 = 0.5",
      hint: "Вероятность события равна отношению количества благоприятных исходов к общему числу исходов; здесь благоприятные исходы — выбор синей чашки, их 10 из 20.",
    }),
  },
  {
    role: "assistant",
    content: JSON.stringify({
      issues: [],
      correct: true,
    }),
  },

  {
    role: "user",
    content: JSON.stringify({
      work: "$a^{8} \\cdot a^{17} : a^{20} = a^{8+17-20} = a^{5}$\n\n$2^{5} = 32$",
      hint: "Используй правила сложения и вычитания степеней: $a^{m} \\cdot a^{n} = a^{m+n}$ и $\\dfrac{a^{p}}{a^{q}} = a^{p-q}$, затем подставь $a=2$.",
    }),
  },
  {
    role: "assistant",
    content: JSON.stringify({
      issues: [],
      correct: true,
    }),
  },
]

export async function verifyContentWithAI(
  question: Pick<Question, "solutionType">,
  generatedWork: string,
  generatedHint?: string | null
): Promise<boolean> {
  if (!generatedWork) {
    return false
  }

  try {
    const userPayload = JSON.stringify({
      work: generatedWork,
      hint: generatedHint,
    })

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...EXAMPLES,
      {
        role: "user",
        content: [{ type: "text", text: userPayload }],
      },
    ]

    const response = await openai.chat.completions.create({
      messages,
      model: "grok-4.1-fast",
      response_format: zodResponseFormat(
        verificationResponseSchema,
        "json_schema"
      ),
      temperature: 0.2,
      // @ts-expect-error TODO add openai.d.ts
      reasoning: {
        effort: "low",
      },
    })

    const content = response.choices?.[0]?.message?.content
    console.dir({ userPayload, response }, { depth: 100 })
    if (!content) {
      console.warn("AI Verification: Empty response content")
      return false
    }

    const result = JSON.parse(content) as z.infer<
      typeof verificationResponseSchema
    >

    return result.correct
  } catch (error) {
    console.error("AI Verification Error:", error)
    return false
  }
}
