import type { PrismaClient } from "@prisma/client"
import { QuestionSource, SolutionType } from "@prisma/client"
import * as cheerio from "cheerio"
import type { AnyNode, Element } from "domhandler"

import {
  fetchFipiPage,
  FIPI_ID_REGEX,
  FIPI_SHOW_PICTURE_Q_REGEX,
} from "@/server/lib/fipi"
import { FIPI_EGE_URL, FIPI_OGE_URL } from "@/utils/consts"
import { convertMathmlToLatex } from "@/utils/latex"

export type ParsedQBlock = {
  id: string
  prompt: string
  body: string
  attachments: string[]
  options: { order: string; body: string }[]
}

export type ParsedIBlock = {
  name: string
  solutionType: SolutionType
  topicIds: string[]
}

export type ParsedQuestion = ParsedQBlock &
  ParsedIBlock & { sourcePosition: number }

export function parseIBlockFromHtml(iblockHtml: string): ParsedIBlock | null {
  const $ = cheerio.load(iblockHtml)
  const iblock = $(".iblock").first()

  if (iblock.length === 0) {
    return null
  }

  const name = iblock
    .find(".id-text .canselect")
    .first()
    .text()
    .trim() as string

  const solutionTypeText = iblock
    .find('td.param-name:contains("Тип ответа:")')
    .first()
    .next("td")
    .text()
    .trim()

  let solutionType: SolutionType
  if (solutionTypeText === "Краткий ответ") {
    solutionType = SolutionType.SHORT
  } else if (solutionTypeText === "Развернутый ответ") {
    solutionType = SolutionType.LONG
  } else if (solutionTypeText === "Выбор ответа из предложенных вариантов") {
    solutionType = SolutionType.MULTICHOICE
  } else if (solutionTypeText === "Выбор ответов из предложенных вариантов") {
    solutionType = SolutionType.MULTIRESPONSE
  } else if (solutionTypeText === "Установление соответствия") {
    solutionType = SolutionType.MULTICHOICEGROUP
  } else {
    solutionType = SolutionType.LONG
  }

  const parseNode = getParseNode()

  const topicIds = Array.from(
    iblock
      .find('td.param-name:contains("КЭС:")')
      .first()
      .next("td")
      .find("div")
      .map((_, n) => {
        const text = parseNode(n).trim()
        if (!text) {
          return null
        }
        const id = text.split(" ")[0]
        if (!id) {
          return null
        }
        return id
      })
  )

  console.log(name, topicIds)

  return { name, solutionType, topicIds }
}

function getParseNode(grade?: string) {
  // this is effectful - context values will be modified
  function _parseNode(
    node: AnyNode,
    {
      isMath = false,
      isNonSemanticTable = false,
      inlineAttachments = true,
    }: {
      isMath?: boolean
      isNonSemanticTable?: boolean
      inlineAttachments?: boolean
    } = {
      isMath: false,
      isNonSemanticTable: false,
      inlineAttachments: true,
    },
    context?: {
      topLevelAttachments: string[]
      inlineAttachmentsCount: number
    }
  ): string {
    if (!node) {
      return ""
    }

    if (node.type === "tag" || node.type === "script") {
      const element = node as Element
      if (
        // skip presentation-related mathjax tags
        element.attribs.class?.includes("MathJax") ||
        element.attribs.class?.includes("MathJax_Preview")
      ) {
        return ""
      }

      const tagName = element.tagName.toLowerCase()

      if (tagName === "table") {
        const tbody = element.childNodes.find(
          (n) => n.type === "tag" && n.tagName === "tbody"
        )
        if (!tbody || tbody.type !== "tag" || tbody.tagName !== "tbody") {
          return ""
        }
        const rows = tbody.children

        const rowsChildren = rows.map((r) =>
          r.type === "tag" && r.tagName === "tr" ? r.children : []
        )
        const isSingleColumn = rowsChildren.every((c) => c.length < 2)

        const isNonSemanticTableClass =
          element.attribs.class?.includes("MsoTableGrid")

        if (isSingleColumn || isNonSemanticTable || isNonSemanticTableClass) {
          const tds = rowsChildren.flat()
          const content = tds
            .map((childNode) =>
              // attachments in non-semantic tables are top level
              _parseNode(childNode, { inlineAttachments: false }, context)
            )
            .join("")
            .trim()
          return content
        }

        const parsedRows = rows
          .map((row) => {
            if (row.type !== "tag" || row.tagName !== "tr") {
              return null
            }
            const tds = row.children.filter(
              (child) => child.type === "tag" && child.tagName === "td"
            )
            if (tds.length === 0) {
              return null
            }
            const parsedTds = tds.map((td) =>
              _parseNode(td, { inlineAttachments: true }, context)
            )
            return parsedTds
          })
          .filter(
            (row): row is string[] =>
              row !== null && row.some((v) => v.trim().length > 0)
          )

        if (!parsedRows[0]) {
          return ""
        }

        const header = "|   ".repeat(parsedRows[0].length) + "|"
        const separator = "|---".repeat(parsedRows[0].length) + "|"

        return `\n${header}\n${separator}\n${parsedRows
          .map((row) => `| ${row.join(" | ")} |`)
          .join("\n")}\n`
      } else if (tagName === "script") {
        const contentHtml = element.childNodes
          .map((childNode) =>
            _parseNode(childNode, { inlineAttachments }, context)
          )
          .join("")
        const attachments = extractImages(contentHtml, grade)
        if (inlineAttachments) {
          const inlinedAttachments: string[] = []
          attachments.forEach((a) => {
            if (context !== undefined) {
              context.inlineAttachmentsCount++
            }
            inlinedAttachments.push(
              inlineImage(a, context?.inlineAttachmentsCount)
            )
          })
          return inlinedAttachments.join("\n\n")
        } else {
          attachments.forEach((a) => context?.topLevelAttachments.push(a))
          return ""
        }
      } else if (tagName === "math") {
        const contentHtml = element.childNodes
          .map((childNode) => _parseNode(childNode, { isMath: true }, context))
          .join("")
        const latex = convertMathmlToLatex("<math>" + contentHtml + "</math>")
        return ` $${latex}$ `
      } else if (
        isMath ||
        tagName === "td" ||
        tagName === "div" ||
        tagName === "p" ||
        tagName === "span" ||
        tagName === "i" ||
        tagName === "b"
      ) {
        const content = element.childNodes
          .map((childNode) =>
            _parseNode(
              childNode,
              {
                isMath,
                inlineAttachments,
              },
              context
            )
          )
          .join("")
          .replaceAll(/ +/g, " ")
          .replaceAll(/ ([\,\?]|\\\.|\\\!)/g, "$1")
        // math elements with no text are still semantically valuable
        if (!content && !isMath) {
          return ""
        }
        const [prefix, suffix] = isMath
          ? [`<${tagName}>`, `</${tagName}>`]
          : content.startsWith("$")
            ? ["", ""]
            : tagName === "i"
              ? [" *", "* "]
              : tagName === "b"
                ? [" **", "** "]
                : ["", ""]
        return prefix + content + suffix
      } else if (tagName === "br") {
        return " "
      }
    } else if (node.type === "text") {
      return node.data.trim() || ""
    }

    return ""
  }
  return _parseNode
}

export function parseQBlockFromHtml(
  qblockHtml: string,
  grade?: string
): ParsedQBlock | null {
  const $ = cheerio.load(
    qblockHtml
      .replaceAll("<m:", "<")
      .replaceAll("</m:", "</")
      .replaceAll("&nbsp;", " "),
    undefined,
    false
  )

  const qblock = $(".qblock").first()

  if (qblock.length === 0) {
    return null
  }

  const guid = qblock.find('input[name="guid"]').first().val() as string
  const prompt = qblock.find(".hint").first().text().trim()

  if (!guid) return null

  const allElements = qblock.find("td.cell_0").contents().toArray()

  const elementsMeta = allElements.map((element) => ({
    element,
    isTable: element.type === "tag" && element.tagName === "table",
  }))

  const nonTableElements = elementsMeta
    .filter((item) => !item.isTable)
    .map((item) => item.element)
  const tableElements = elementsMeta
    .filter((item) => item.isTable)
    .map((item) => item.element)

  const parseNode = getParseNode(grade)
  const parsingContext = { topLevelAttachments: [], inlineAttachmentsCount: 0 }

  const parsedNonTables = nonTableElements.map((element) =>
    parseNode(element, undefined, parsingContext)
  )
  const hasNonTableContent = parsedNonTables.some(
    (t) => t.replaceAll(/\s/g, "") !== ""
  )
  const parsedTables = tableElements.map((element) =>
    parseNode(
      element,
      { isNonSemanticTable: !hasNonTableContent },
      parsingContext
    )
  )

  const bodyParts: string[] = []
  let nonTableIdx = 0
  let tableIdx = 0
  elementsMeta.forEach((meta) => {
    if (meta.isTable) {
      const content = parsedTables[tableIdx++]
      if (!content) {
        return
      }
      bodyParts.push(content)
    } else {
      const content = parsedNonTables[nonTableIdx++]
      if (!content) {
        return
      }
      bodyParts.push(content)
    }
  })

  const body = bodyParts
    .map((p) => p.trim())
    .filter((p) => p)
    .join("\n\n")

  const multiOptions: ParsedQBlock["options"] = []
  qblock
    .find(".distractors-table > tbody > tr > td:last-child")
    .each((i, element) => {
      const text = parseNode(
        element,
        { inlineAttachments: true },
        parsingContext
      )

      multiOptions.push({
        order: (i + 1).toString(),
        body: text,
      })
    })

  const multiGroupOptions: ParsedQBlock["options"] = []
  const selects = qblock.find(
    ".answer-table > tbody > tr:last-child > td > select"
  )
  const selectHeadings = qblock.find(
    ".answer-table > tbody > tr:first-child > td"
  )
  for (let i = 0; i < selects.length; i++) {
    const selectElement = selects[i]

    const values: string[] = []
    $(selectElement)
      .find("option")
      .each((_, optionElement) => {
        if (!optionElement.attribs.value) {
          return
        }
        values.push(optionElement.attribs.value)
      })

    const heading = selectHeadings[i]
      ? parseNode(selectHeadings[i]!)
      : (i + 1).toString()

    multiGroupOptions.push({
      order: heading,
      body: values.join("|"),
    })
  }

  return {
    id: guid,
    prompt,
    body,
    attachments: parsingContext.topLevelAttachments,
    options: [...multiOptions, ...multiGroupOptions],
  }
}

function extractImages(html: string, grade?: string) {
  const attachments: string[] = []
  const matches = html.matchAll(FIPI_SHOW_PICTURE_Q_REGEX)
  for (const match of matches) {
    attachments.push(
      `${grade === "9" ? FIPI_OGE_URL : FIPI_EGE_URL}/${match[1]}`
    )
  }
  return attachments
}

function inlineImage(src: string, i?: number) {
  const title = "Изображение" + (i !== undefined ? " " + i : "")
  return `![${title}](${src} "${title}")`
}

export async function scrapeSubjects(db: PrismaClient, grade: string) {
  const html = await fetchFipiPage("/bank/index.php", grade)

  const $ = cheerio.load(html)

  const subjects = $(".projects.active li")
    .map((_, el) => {
      const element = $(el)
      const id = element.attr("id")?.replace("p_", "")
      const name = element.text().trim()
      if (!id || !name) return null
      return { id, name, grade }
    })
    .get()
    .filter(Boolean)

  await db.subject.createMany({
    data: subjects,
  })

  return { createdCount: subjects.length }
}

export async function scrapeTopics(db: PrismaClient, subjectId: string) {
  const subject = await db.subject.findUnique({
    where: { id: subjectId },
    select: { grade: true },
  })
  const grade = subject?.grade ?? undefined

  const html = await fetchFipiPage(`/bank/index.php?proj=${subjectId}`, grade)

  const $ = cheerio.load(html)

  const scrapedRootTopics: { id: string; name: string }[] = []
  const scrapedSubTopics: {
    id: string
    name: string
    parentId: string
  }[] = []

  let currentParentId: string | null = null
  $('.filter-title:contains("Темы КЭС")')
    .first()
    .next(".dropdown")
    .find(".dropdown-item")
    .each((_, el) => {
      const element = $(el)
      if (element.hasClass("dropdown-header")) {
        const text = element.text().trim()
        const id = text.match(FIPI_ID_REGEX)?.[0]?.trim()
        const name = text.replace(FIPI_ID_REGEX, "")
        if (id && name) {
          currentParentId = id
          scrapedRootTopics.push({ id, name })
        }
      } else {
        const label = element.find("label")
        const id = label.find("input").val() as string
        const name = label.text().trim().replace(FIPI_ID_REGEX, "")

        if (id && name && currentParentId) {
          scrapedSubTopics.push({ id, name, parentId: currentParentId })
        }
      }
    })

  const oldRootTopics = await db.topic.findMany({
    where: { subjectId, parentId: null },
    select: { id: true },
  })
  const oldRootTopicIds = new Set(oldRootTopics.map((t) => t.id))

  const newRootTopicsData = scrapedRootTopics
    .filter((t) => !oldRootTopicIds.has(t.id))
    .map((t) => ({ ...t, subjectId }))

  if (newRootTopicsData.length > 0) {
    await db.topic.createMany({ data: newRootTopicsData })
  }

  const allRootTopics = await db.topic.findMany({
    where: { subjectId, parentId: null },
  })

  const subTopicsData = scrapedSubTopics
    .map(({ id, name, parentId }) => {
      if (!parentId || !allRootTopics.find((t) => t.id === parentId))
        return null
      return {
        id,
        name,
        parentId,
        subjectId,
      }
    })
    .filter((t) => t !== null)

  let createdSubTopicsCount = 0
  if (subTopicsData.length > 0) {
    const result = await db.topic.createMany({
      data: subTopicsData,
    })
    createdSubTopicsCount = result.count
  }

  return {
    createdCount: newRootTopicsData.length + createdSubTopicsCount,
  }
}

export async function scrapePage(
  db: PrismaClient,
  subjectId: string,
  page: number,
  user?: { id: string }
) {
  const subject = await db.subject.findUnique({
    where: { id: subjectId },
    select: { grade: true },
  })
  const grade = subject?.grade ?? undefined

  const path = `/bank/questions.php?proj=${subjectId}&page=${
    page - 1
  }&pagesize=10&rfsh=${encodeURIComponent(new Date().toString())}`

  const html = await fetchFipiPage(path, grade)

  const $ = cheerio.load(html)

  const parsedQuestions = $(".qblock")
    .map((i, el) => {
      console.log("parsing question")
      const qblock = $(el)
      const iblock = qblock.next()
      if (iblock.length > 0) {
        const qblockData = parseQBlockFromHtml(
          '<div class="qblock">' + qblock.html() + "</div>",
          grade
        )
        console.log("parsed qblock", qblockData)
        const iblockData = parseIBlockFromHtml(
          '<div class="iblock">' + iblock.html() + "</div>"
        )
        console.log("parsed iblock", iblockData)

        if (qblockData && iblockData) {
          return {
            ...qblockData,
            ...iblockData,
            sourcePosition: (page - 1) * 10 + i,
          }
        }
      }
      return null
    })
    .get()
    .filter((q): q is ParsedQuestion => q !== null)

  const parsedGuids = parsedQuestions.map((q) => q.id)
  const existingQuestions = await db.question.findMany({
    where: { id: { in: parsedGuids } },
    select: { id: true },
  })
  const existingIds = new Set(existingQuestions.map((q) => q.id))

  const newQuestions = parsedQuestions.filter((q) => !existingIds.has(q.id))

  for (const question of newQuestions) {
    const { topicIds, attachments, options, ...data } = question

    await db.question.create({
      data: {
        id: data.id,
        name: data.name,
        prompt: data.prompt,
        body: data.body,
        solutionType: data.solutionType,
        source: QuestionSource.FIPI,
        subjectId,
        creatorId: user?.id,
        topics: {
          create: topicIds.map((id) => ({
            topic: { connect: { id_subjectId: { id, subjectId } } },
          })),
        },
        options: { create: options },
        attachments: {
          create: attachments.map((url) => ({ url })),
        },
        sourcePosition: data.sourcePosition,
      },
    })
  }
  return { createdCount: newQuestions.length }
}
