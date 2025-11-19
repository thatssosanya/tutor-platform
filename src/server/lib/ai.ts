import { SolutionType } from "@prisma/client"
import { type Response } from "undici"
import type OpenAI from "openai"

import type { RouterOutputs } from "@/utils/api"

import { fetchFipi } from "./fipi"
type Question = RouterOutputs["question"]["getPaginated"]["items"][number]

export const SOLUTION_TYPE_INSTRUCTION_MARKER = "%SOLUTION_TYPE_INSTRUCTION%"
export const GRADE_MARKER = "%GRADE%"
export const SYSTEM_PROMPT = `Ты — экспертный русскоязычный ИИ-ассистент для образовательной платформы.
Твоя цель — решить предложенную задачу из экзамена способом, доступным для ученика ${GRADE_MARKER} класса, и представить решение в строгом, пошаговом формате.

Твой ответ всегда должен быть в формате JSON и содержать три ключа: \`hint\`, \`work\` и \`solution\`.

Придерживайся следующих стилистических правил:
- Формальный тон: Твои ответы это не часть диалога, а образовательный материал. Стиль решения должен быть строгим и академическим, как в учебнике. Избегай разговорных выражений ("давайте посмотрим", "не забудьте") и прямых обращений к ученику.
- Структура "Действие -> Результат": Решение должно быть представлено как четкая последовательность логических шагов. Перед выполнением математического преобразования, кратко укажи на само действие. Например: "Представим 64 в виде степени 2:", "Возведём обе части уравнения в квадрат:", "Применим свойство степеней:".
- Полнота вычислений: Показывай все ключевые этапы вычислений. Не пропускай шаги, которые важны для понимания логики решения.
- Решение квадратных уравнений: При решении полных квадратных уравнений вида $ax^2 + bx + c = 0$, обязательно используй метод через дискриминант. Сначала вычисли значение дискриминанта по формуле $D = b^2 - 4ac$. Затем найди корни по формуле $x_{1,2} = \\frac{-b \\pm \\sqrt{D}}{2a}$.

Предоставь свое решение на русском языке в поле \`work\`.
Начинай поле \`work\` сразу с решения, не добавляя общий заголовок или слово "решение" и не повторяя условие задачи.
Будь лаконичен в своем решении и не объясняй свои действия больше, чем следует.
Включай проверку ответа в конце своего решения только если задача подразумевает область допустимых значений, например, для значения переменной под квадратным корнем.
Если нет области допустимых значений, закончи свое решение как только достигнешь ответа.
Достигнув ответа, не повторяй его в поле \`work\` — закончи свое решение последней операцией, которая приводит к ответу.

В поле \`hint\` предоставь подсказку для ученика, которая поможет ему понять, как придти к нужному решению, не показывая само решение.
В случае математики это будет теорема или свойство, которое нужно применить для решения.

В полях \`work\` и \`hint\` поддерживается подмножество функционала Github Flavored Markdown:
- Перенос строки — используй два символа переноса строки подряд: \`\\n\\n\`\` вместо \`\\n\`;
- Заголовки (строка начинается с #);
- Курсив (сегмент начинается с * и заканчивается *);
- Жирный текст (сегмент начинается с ** и заканчивается **);
- LaTeX (сегмент начинается с $ и заканчивается $) — используй для всех математических выражений, и всегда ограничивай LaTeX сегменты, когда используешь LaTeX команды.

Текст задачи может включать некорректно сформированный LaTeX. Не опирайся на то, как LaTeX команды используются в тексте задачи — твои LaTeX сегменты должны содержать стандартный, корректный LaTeX.
Все математические выражения должны быть ограничены символом $ с обеих сторон. LaTeX, не ограниченный символом $ с обеих сторон, не будет обработан корректно — это критическая ошибка.
Нельзя переносить строку (использовать \`\\n\`) внутри LaTeX сегментов. Если LaTeX сегмент нужно разбить на несколько строк, разбей его на несколько LaTeX сегментов, отдельно ограничивая каждый символом $ с обеих сторон, и переноси строку между ними.
В LaTeX сегментах не используй команду \\text для текста — просто пиши текст. Если текст, являющийся аргументом для LaTeX команды, включает пробелы, используй команду \`\\space\`, например, \`_{с\\spaceпробелом}\`

Предоставь конечный результат в поле \`solution\`.
${SOLUTION_TYPE_INSTRUCTION_MARKER}`

export const SOLUTION_TYPE_INSTRUCTIONS: Record<string, string> = {
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

// group 1 = [alt], group 2 = url
export const INLINE_IMAGE_REGEX = /!(\[.*?\])\((.*?)\s(?:.*?)\)/g

export function renderMultiOptions(
  options: Pick<Question["options"][number], "order" | "body">[],
  solutionType: SolutionType
) {
  switch (solutionType) {
    case SolutionType.MULTICHOICE:
    case SolutionType.MULTIRESPONSE: {
      return (
        "\n\nВарианты ответа:\n" +
        JSON.stringify(
          options.map((o) => ({
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
          options.map((o, i) => ({
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
}

export function extractInlineImageUrls(strings: string[]) {
  const inlineImageUrls = strings
    .flatMap((s) => [...s.matchAll(INLINE_IMAGE_REGEX)].map((m) => m[2]))
    .filter((url) => url !== undefined)
  return inlineImageUrls
}

export async function renderImageMessageParts(urls: string[]) {
  const attachmentPromises = urls.map(async (url) => {
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
  return imageMessageParts
}

export async function responseToBase64DataURL(
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

// TODO add pre-rendering examples as a build step
const globalForCache = globalThis as unknown as {
  exampleMessagesCache: Partial<
    Record<SolutionType, OpenAI.Chat.Completions.ChatCompletionMessageParam[]>
  >
}
const exampleMessagesCache = globalForCache.exampleMessagesCache || {}
if (process.env.NODE_ENV !== "production") {
  globalForCache.exampleMessagesCache = exampleMessagesCache
}

export async function getExampleMessages(
  solutionType: SolutionType
): Promise<OpenAI.Chat.Completions.ChatCompletionMessageParam[]> {
  if (exampleMessagesCache[solutionType]) {
    return exampleMessagesCache[solutionType]!
  }

  const rawExamples = EXAMPLES[solutionType] || []

  const processed = await Promise.all(
    rawExamples.map(async (example) => {
      const imageUrls =
        "imageUrls" in example && !!example.imageUrls ? example.imageUrls : []

      const imageParts =
        imageUrls.length > 0 ? await renderImageMessageParts(imageUrls) : []

      const userMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
        role: "user",
        content: [{ type: "text", text: example.question }, ...imageParts],
      }

      const assistantMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam =
        {
          role: "assistant",
          content: [{ type: "text", text: example.response }],
        }

      return [userMessage, assistantMessage]
    })
  )

  const flatMessages = processed.flat()

  exampleMessagesCache[solutionType] = flatMessages

  return flatMessages
}

export const EXAMPLES = {
  [SolutionType.SHORT]: [
    {
      question:
        "Даны векторы $\\overset{\\rightarrow}{a}\\left(25 ; 0\\right)$ и $\\overset{\\rightarrow}{b}\\left(1 ; - 5\\right).$ Найдите длину вектора $\\overset{\\rightarrow}{a} - 4 \\overset{\\rightarrow}{b} .$",
      response: JSON.stringify({
        hint: "Сначала найдите координаты результирующего вектора, выполнив операции вычитания и умножения на скаляр. Затем используйте формулу для нахождения длины (модуля) вектора: $||\\vec{v}|| = \\sqrt{v_x^2 + v_y^2}$.",
        work: "Найдём координаты вектора $\\vec{a} - 4\\vec{b}$:\n\n$\\vec{a} - 4\\vec{b} = (25; 0) - 4(1; -5) = (25 - 4; 0 - (-20)) = (21; 20)$\n\nТеперь найдём его длину:\n\n$||\\vec{a} - 4\\vec{b}|| = \\sqrt{21^2 + 20^2} = \\sqrt{441 + 400} = \\sqrt{841} = 29$",
        solution: "29",
      }),
    },
    {
      question:
        "В треугольнике $A B C$ известно, что $A B = B C = 15$, $A C = 24$ . Найдите длину медианы $B M$ .",
      response: JSON.stringify({
        hint: "В равнобедренном треугольнике медиана, проведённая к основанию, также является высотой. Это позволяет найти её длину с помощью теоремы Пифагора в получившемся прямоугольном треугольнике.",
        work: "В равнобедренном треугольнике $ABC$ медиана $BM$ к основанию $AC$ является также высотой, поэтому треугольник $ABM$ — прямоугольный.\n\nТочка $M$ делит основание $AC$ пополам: $AM = \\frac{AC}{2} = \\frac{24}{2} = 12$.\n\nПо теореме Пифагора для треугольника $ABM$:\n\n$BM = \\sqrt{AB^2 - AM^2} = \\sqrt{15^2 - 12^2} = \\sqrt{225 - 144} = \\sqrt{81} = 9$",
        solution: "9",
      }),
    },
    {
      question: "Решите уравнение $\\sqrt{3 x - 8} = 5$ .",
      response: JSON.stringify({
        hint: "Для решения уравнения возведите обе части в квадрат. После нахождения корня необходимо выполнить проверку, чтобы убедиться, что подкоренное выражение неотрицательно.",
        work: "Возведём обе части уравнения в квадрат:\n\n$3x - 8 = 5^2$\n\n$3x - 8 = 25$\n\n$3x = 33$\n\n$x = 11$\n\nПроверка: при $x=11$ подкоренное выражение $3(11) - 8 = 25$, что больше или равно нулю. Корень подходит.",
        solution: "11",
      }),
    },
    {
      question:
        "Найдите значение выражения $\\dfrac{8^{10} \\cdot 3^{11}}{24^{9}}$ .",
      response: JSON.stringify({
        hint: "Представьте основание $24$ как произведение $8 \\cdot 3$. Затем примените свойства степеней: $(ab)^n = a^n b^n$ и $\\frac{a^m}{a^n} = a^{m-n}$.",
        work: "$\\frac{8^{10} \\cdot 3^{11}}{24^{9}} = \\frac{8^{10} \\cdot 3^{11}}{(8 \\cdot 3)^{9}} = \\frac{8^{10} \\cdot 3^{11}}{8^{9} \\cdot 3^{9}}$\n\n$= 8^{10-9} \\cdot 3^{11-9} = 8^{1} \\cdot 3^{2} = 8 \\cdot 9 = 72$",
        solution: "72",
      }),
    },
    {
      question:
        "Фабрика выпускает сумки. В среднем 4 сумки из 50 имеют скрытый дефект. Найдите вероятность того, что купленная сумка окажется без скрытого дефекта.",
      response: JSON.stringify({
        hint: "Вероятность противоположного события можно найти по формуле $P(A) = 1 - P(\\bar{A})$. Сначала найдите вероятность купить сумку с дефектом.",
        work: "Найдём вероятность того, что купленная сумка имеет дефект:\n\n$P(дефект) = \\frac{4}{50} = 0.08$\n\nВероятность купить сумку без дефекта — это вероятность противоположного события:\n\n$P(без\\spaceдефекта) = 1 - P(дефект) = 1 - 0.08 = 0.92$",
        solution: "0.92",
      }),
    },
  ],
  // TODO long generation
  [SolutionType.LONG]: [],
  [SolutionType.MULTICHOICE]: [
    {
      question:
        "Какое из чисел $\\dfrac{45}{19}, \\dfrac{52}{19}, \\dfrac{68}{19}$ и $\\dfrac{77}{19}$ принадлежит отрезку $\\left(3 ; 4\\right)$?" +
        renderMultiOptions(
          [
            {
              order: "1",
              body: " $\\dfrac{45}{19}$ ",
            },
            {
              order: "2",
              body: " $\\dfrac{52}{19}$ ",
            },
            {
              order: "3",
              body: " $\\dfrac{68}{19}$ ",
            },
            {
              order: "4",
              body: " $\\dfrac{77}{19}$ ",
            },
          ],
          SolutionType.MULTICHOICE
        ),
      response: JSON.stringify({
        hint: "Представьте границы интервала в виде дробей с тем же знаменателем, что и у предложенных чисел. Затем сравните числители.",
        work: "Приведём границы интервала к знаменателю 19:\n\n$3 = \\frac{3 \\cdot 19}{19} = \\frac{57}{19}$\n\n$4 = \\frac{4 \\cdot 19}{19} = \\frac{76}{19}$\n\nИнтервал $(3; 4)$ соответствует интервалу $(\\frac{57}{19}; \\frac{76}{19})$.\n\nСреди предложенных дробей только числитель дроби $\\frac{68}{19}$ удовлетворяет неравенству $57 < 68 < 76$.",
        solution: "3",
      }),
    },
    {
      question:
        "Какое из следующих утверждений является истинным высказыванием?" +
        renderMultiOptions(
          [
            {
              order: "1",
              body: "Площадь квадрата равна произведению двух его смежных сторон.",
            },
            {
              order: "2",
              body: "Диагональ трапеции делит её на два равных треугольника.",
            },
            {
              order: "3",
              body: "Если две стороны одного треугольника соответственно равны двум сторонам другого треугольника, то такие треугольники равны.",
            },
          ],
          SolutionType.MULTICHOICE
        ),
      response: JSON.stringify({
        hint: null,
        work: "Проанализируем каждое утверждение:\n\n1. **Верно.** Площадь квадрата со стороной $a$ вычисляется по формуле $S = a^2$. Произведение двух его смежных сторон равно $a \\cdot a = a^2$.\n\n2. **Неверно.** Диагональ делит трапецию на два треугольника, которые в общем случае не равны.\n\n3. **Неверно.** Это не является признаком равенства треугольников. Для равенства по двум сторонам необходим также равный угол между ними.",
        solution: "1",
      }),
    },
    {
      imageUrls: [
        "https://oge.fipi.ru/docs/DE0E276E497AB3784C3FC4CC20248DC0/questions/008E84293C5AB98E47539B211B8DC443/xs3qstsrc008E84293C5AB98E47539B211B8DC443_8_1734423599.png",
      ],
      question:
        "На координатной прямой отмечены числа x и y.\n\n[Изображение 1]\n\nКакое из приведённых утверждений для этих чисел верно?" +
        renderMultiOptions(
          [
            {
              order: "1",
              body: " $x + y > 0$ ",
            },
            {
              order: "2",
              body: " $x y^{2} < 0$ ",
            },
            {
              order: "3",
              body: " $x - y < 0$ ",
            },
            {
              order: "4",
              body: " $x^{2} y > 0$ ",
            },
          ],
          SolutionType.MULTICHOICE
        ),
      response: JSON.stringify({
        hint: "Определите знаки чисел $x$ и $y$ по их расположению на прямой относительно нуля. Сравните их модули (расстояния до нуля) и проверьте каждое утверждение.",
        work: "Из графика следует, что $y < 0 < x$ и по расстоянию до нуля $|x| > |y|$. Проверим каждое утверждение:\n\n1. $x + y > 0$: **Верно**, так как положительное число $x$ имеет больший модуль, чем отрицательное число $y$.\n\n2. $x y^{2} < 0$: **Неверно**. Так как $x > 0$ и $y^2 > 0$, их произведение $xy^2 > 0$.\n\n3. $x - y < 0$: **Неверно**. Так как $x > 0$ и $-y > 0$, их сумма $x + (-y)$ положительна.\n\n4. $x^{2} y > 0$: **Неверно**. Так как $x^2 > 0$ и $y < 0$, их произведение $x^2y < 0$.",
        solution: "1",
      }),
    },
    {
      question:
        "Какое из следующих утверждений является истинным высказыванием?" +
        renderMultiOptions(
          [
            {
              order: "1",
              body: "Все углы ромба равны.",
            },
            {
              order: "2",
              body: "Если стороны одного четырёхугольника соответственно равны сторонам другого четырёхугольника, то такие четырёхугольники равны.",
            },
            {
              order: "3",
              body: "Через любую точку, лежащую вне окружности, можно провести две касательные к этой окружности.",
            },
          ],
          SolutionType.MULTICHOICE
        ),
      response: JSON.stringify({
        hint: null,
        work: "Проанализируем каждое утверждение:\n\n1. **Неверно.** В ромбе равны только противоположные углы. Ромб, у которого все углы равны, является квадратом.\n\n2. **Неверно.** Равенство соответствующих сторон не гарантирует равенства четырёхугольников, так как их углы могут различаться.\n\n3. **Верно.** Это свойство касательных, проведённых из одной точки к окружности.",
        solution: "3",
      }),
    },
  ],
  [SolutionType.MULTIRESPONSE]: [
    {
      question:
        "Какие из следующих утверждений являются истинными высказываниями?" +
        renderMultiOptions(
          [
            {
              order: "1",
              body: "Через точку, не лежащую на данной прямой, можно провести прямую, параллельную этой прямой.",
            },
            {
              order: "2",
              body: "Если диагонали параллелограмма равны, то этот параллелограмм являетсяромбом.",
            },
            {
              order: "3",
              body: "Расстояние от точки, лежащей на окружности, до центра окружности равно радиусу.",
            },
          ],
          SolutionType.MULTIRESPONSE
        ),
      response: JSON.stringify({
        hint: "1. Вспомните аксиому о параллельных прямых.\n\n2. Проанализируйте свойства диагоналей разных видов параллелограммов (прямоугольник, ромб).\n\n3. Вспомните определение радиуса окружности.",
        work: "Проанализируем каждое утверждение:\n\n1. **Верно.** Это следует из аксиомы параллельности Евклида.\n\n2. **Неверно.** Параллелограмм с равными диагоналями является прямоугольником, но не обязательно ромбом.\n\n3. **Верно.** По определению, все точки окружности находятся на одинаковом расстоянии (радиусе) от её центра.",
        solution: "1|3",
      }),
    },
    {
      question:
        "Какие из следующих утверждений являются истинными высказываниями?" +
        renderMultiOptions(
          [
            {
              order: "1",
              body: "Площадь треугольника меньше произведения двух его сторон.",
            },
            {
              order: "2",
              body: "Средняя линия трапеции равна сумме её оснований.",
            },
            {
              order: "3",
              body: "Если два угла одного треугольника равны двум углам другого треугольника, то такие треугольники подобны.",
            },
          ],
          SolutionType.MULTIRESPONSE
        ),
      response: JSON.stringify({
        hint: "1. Используйте формулу площади треугольника: $S = \\frac{1}{2}ab \\sin\\gamma$ и учтите диапазон значений синуса.\n\n2. Вспомните формулу средней линии трапеции.\n\n3. Вспомните признаки подобия треугольников.",
        work: "Проанализируем каждое утверждение:\n\n1. **Верно.** Площадь треугольника со сторонами $a$ и $b$ и углом $\\gamma$ между ними равна $S = \\frac{1}{2}ab\\sin\\gamma$. Поскольку $\\sin\\gamma \\le 1$, то $S \\le \\frac{1}{2}ab$. Так как стороны $a$ и $b$ положительны, $\\frac{1}{2}ab < ab$, следовательно, $S < ab$.\n\n2. **Неверно.** Средняя линия трапеции равна полусумме её оснований, а не сумме.\n\n3. **Верно.** Это первый признак подобия треугольников (по двум углам).",
        solution: "1|3",
      }),
    },
  ],
  [SolutionType.MULTICHOICEGROUP]: [
    {
      imageUrls: [
        "https://oge.fipi.ru/docs/DE0E276E497AB3784C3FC4CC20248DC0/questions/014794ADBD339EF74FDB5D5DB1F789D6/xs3qvrsrc208FE97771C5A672424EAE7913FDBEFE_1_1457684528.png",
        "https://oge.fipi.ru/docs/DE0E276E497AB3784C3FC4CC20248DC0/questions/014794ADBD339EF74FDB5D5DB1F789D6/xs3qvrsrcA50241DAE5A1AB1B46D35EC53FB3FF92_1_1457684530.png",
        "https://oge.fipi.ru/docs/DE0E276E497AB3784C3FC4CC20248DC0/questions/014794ADBD339EF74FDB5D5DB1F789D6/xs3qvrsrc1005C54274D2ADA345DB28D789154174_1_1457684532.png",
      ],
      question:
        "На рисунках изображены графики функций вида $y = a x^{2} + b x + c$ . Установите соответствие между знаками коэффициентов $a$ и $c$ и графиками функций.\n\n| | | | | | |\n|---|---|---|---|---|---|\n| **А)** | $a > 0$, $c > 0$ | **Б)** | $a < 0$, $c > 0$ | **В)** | $a > 0$, $c < 0$ |\n\n| | | | | | |\n|---|---|---|---|---|---|\n| **1)** | [Изображение 1] | **2)** | [Изображение 2] | **3)** | [Изображение 3] |\n\nВ таблице под каждой буквой укажите соответствующий номер." +
        renderMultiOptions(
          [
            {
              order: " **А** ",
              body: "0|1|2|3",
            },
            {
              order: " **Б** ",
              body: "0|1|2|3",
            },
            {
              order: " **В** ",
              body: "0|1|2|3",
            },
          ],
          SolutionType.MULTICHOICEGROUP
        ),
      response: JSON.stringify({
        hint: "Знак коэффициента $a$ определяет направление ветвей параболы (вверх или вниз). Коэффициент $c$ показывает ординату точки пересечения графика с осью $y$.",
        work: "Коэффициент $a$ в уравнении параболы $y = ax^2 + bx + c$ определяет направление ветвей: если $a > 0$, ветви направлены вверх; если $a < 0$ — вниз.\n\nКоэффициент $c$ — это ордината точки пересечения параболы с осью $y$.\n\nА) $a > 0, c > 0$: ветви вверх, пересечение оси $y$ выше нуля. Этому соответствует график **3**.\n\nБ) $a < 0, c > 0$: ветви вниз, пересечение оси $y$ выше нуля. Этому соответствует график **2**.\n\nВ) $a > 0, c < 0$: ветви вверх, пересечение оси $y$ ниже нуля. Этому соответствует график **1**.",
        solution: "3|2|1",
      }),
    },
    {
      imageUrls: [
        "https://oge.fipi.ru/docs/DE0E276E497AB3784C3FC4CC20248DC0/questions/019961A36C0EA21D43630E3CE4099D4D/xs3qvrsrcE6A996E3D91B9895428A11E284031307_1_1457681900.png",
        "https://oge.fipi.ru/docs/DE0E276E497AB3784C3FC4CC20248DC0/questions/019961A36C0EA21D43630E3CE4099D4D/xs3qvrsrc8A0E9BFA44F5A0D141F0DB8118A13D19_1_1457681902.png",
        "https://oge.fipi.ru/docs/DE0E276E497AB3784C3FC4CC20248DC0/questions/019961A36C0EA21D43630E3CE4099D4D/xs3qvrsrc1A07EC667577BCA74814AEC315AB789D_1_1457681904.png",
      ],
      question:
        "Установите соответствие между функциями и их графиками.\n\n| | | | | | |\n|---|---|---|---|---|---|\n| **А)** | $y = \\dfrac{1}{3} x + 2 $ | **Б)** | $y = - 4 x^{2} + 20 x - 22 $ | **В)** | $y = \\dfrac{1}{x} $ |\n\n| | | | | | |\n|---|---|---|---|---|---|\n| **1)** | [Изображение 1] | **2)** | [Изображение 2] | **3)** | [Изображение 3] |\n\nВ таблице под каждой буквой укажите соответствующий номер." +
        renderMultiOptions(
          [
            {
              order: " **А** ",
              body: "0|1|2|3",
            },
            {
              order: " **Б** ",
              body: "0|1|2|3",
            },
            {
              order: " **В** ",
              body: "0|1|2|3",
            },
          ],
          SolutionType.MULTICHOICEGROUP
        ),
      response: JSON.stringify({
        hint: "Определите тип каждой функции (линейная, квадратичная, обратная пропорциональность) и сопоставьте с представленными графиками (прямая, парабола, гипербола).",
        work: "Определим вид каждой функции и сопоставим с её графиком:\n\nА) $y = \\frac{1}{3}x + 2$ — линейная функция, её график — прямая. Этому соответствует рисунок **2**.\n\nБ) $y = -4x^2 + 20x - 22$ — квадратичная функция, её график — парабола. Так как коэффициент при $x^2$ отрицателен ($-4$), ветви параболы направлены вниз. Этому соответствует рисунок **1**.\n\nВ) $y = \\frac{1}{x}$ — обратная пропорциональность, её график — гипербола. Этому соответствует рисунок **3**.",
        solution: "2|1|3",
      }),
    },
  ],
}
