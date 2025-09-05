import { z } from "zod"
import * as cheerio from "cheerio"
import { MathMLToLaTeX } from "mathml-to-latex"
import { QuestionSource, SolutionType } from "@prisma/client"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import {
  fetchFipi,
  FIPI_ID_CLEANUP_REGEX,
  FIPI_SHOW_PICTURE_Q_REGEX,
  FIPI_URL,
} from "@/server/lib/fipi"

export const scraperRouter = createTRPCRouter({
  scrapeSubjects: protectedProcedure.mutation(async ({ ctx }) => {
    const html = await fetchFipi("/bank/index.php")

    const $ = cheerio.load(html)

    const subjects = $(".projects.active li")
      .map((_, el) => {
        const element = $(el)
        const id = element.attr("id")?.replace("p_", "")
        const name = element.text().trim()
        if (!id || !name) return null
        return { id, name }
      })
      .get()
      .filter(Boolean)

    await ctx.db.subject.createMany({
      data: subjects,
    })

    return { createdCount: subjects.length }
  }),

  scrapeTopics: protectedProcedure
    .input(z.object({ subjectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const html = await fetchFipi(`/bank/index.php?proj=${input.subjectId}`)

      const $ = cheerio.load(html)

      const scrapedRootTopicNames: string[] = []
      const scrapedSubTopics: {
        id: string
        name: string
        parentName: string
      }[] = []

      let currentParentName: string | null = null
      $('.filter-title:contains("Темы КЭС")')
        .first()
        .next(".dropdown")
        .find(".dropdown-item")
        .each((_, el) => {
          const element = $(el)
          if (element.hasClass("dropdown-header")) {
            currentParentName = element
              .text()
              .trim()
              .replace(FIPI_ID_CLEANUP_REGEX, "")
            scrapedRootTopicNames.push(currentParentName)
          } else {
            const label = element.find("label")
            const id = label.find("input").val() as string
            const name = label.text().trim().replace(FIPI_ID_CLEANUP_REGEX, "")

            if (id && name && currentParentName) {
              scrapedSubTopics.push({ id, name, parentName: currentParentName })
            }
          }
        })

      const existingRootTopics = await ctx.db.topic.findMany({
        where: { subjectId: input.subjectId, parentId: null },
        select: { name: true },
      })
      const existingRootTopicNames = new Set(
        existingRootTopics.map((t) => t.name)
      )

      const newRootTopicsData = scrapedRootTopicNames
        .filter((name) => !existingRootTopicNames.has(name))
        .map((name) => ({ name, subjectId: input.subjectId }))

      if (newRootTopicsData.length > 0) {
        await ctx.db.topic.createMany({ data: newRootTopicsData })
      }

      const allRootTopics = await ctx.db.topic.findMany({
        where: { subjectId: input.subjectId, parentId: null },
      })

      const parentNameToIdMap = new Map<string, string>()
      allRootTopics.forEach((topic) => {
        parentNameToIdMap.set(topic.name, topic.id)
      })

      const subTopicsData = scrapedSubTopics
        .map(({ id, name, parentName }) => {
          const parentId = parentNameToIdMap.get(parentName)
          if (!parentId) return null
          return {
            id,
            name,
            parentId,
            subjectId: input.subjectId,
          }
        })
        .filter((t): t is NonNullable<typeof t> => t !== null)

      let createdSubTopicsCount = 0
      if (subTopicsData.length > 0) {
        const result = await ctx.db.topic.createMany({
          data: subTopicsData,
        })
        createdSubTopicsCount = result.count
      }

      return {
        createdCount: newRootTopicsData.length + createdSubTopicsCount,
      }
    }),

  scrapePage: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1),
        subjectId: z.string(),
      })
    )
    .mutation(async ({ ctx, input: { subjectId, page } }) => {
      const path = `/bank/questions.php?proj=${subjectId}&page=${
        page - 1
      }&pagesize=10&rfsh=${encodeURIComponent(new Date().toString())}`
      const referer = `/bank/index.php?proj=${subjectId}`

      const html = await fetchFipi(path, referer)
      // console.log("\n\n" + html + "\n\n")

      const $ = cheerio.load(
        html.replaceAll("<m:", "<").replaceAll("</m:", "</")
      )

      const parsedQuestions = $(".qblock")
        .map((_, el) => {
          const qblock = $(el)

          const guid = qblock.find('input[name="guid"]').first().val() as string
          const prompt = qblock.find(".hint").first().text().trim()
          const iblock = qblock.next().first()
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
          console.log({ guid, prompt, name, solutionTypeText })

          let solutionType: SolutionType
          if (solutionTypeText === "Краткий ответ") {
            solutionType = SolutionType.SHORT
          } else if (solutionTypeText === "Развернутый ответ") {
            solutionType = SolutionType.LONG
          } else {
            return null
          }

          if (!guid || !name) return null

          const bodyParts: string[] = []
          qblock.find("td.cell_0 p.MsoNormal").each((i, p_element) => {
            let currentPart = ""
            $(p_element)
              .contents()
              .each((j, node) => {
                const $node = $(node)
                if (node.type === "text") {
                  currentPart += $node.text()
                } else if (node.type === "tag" && $node.is("math")) {
                  console.log($node.html())
                  const mathML = "<math>" + ($node.html() ?? "") + "</math"
                  const latex = MathMLToLaTeX.convert(mathML)
                  currentPart += `$${latex}$`
                }
              })
            const cleanedPart = currentPart.replace(/\s+/g, " ").trim()
            if (cleanedPart) bodyParts.push(cleanedPart)
          })
          const body = bodyParts.join("\n")

          const attachments: string[] = []
          qblock.find("script").each((_, scriptEl) => {
            const scriptContent = $(scriptEl).html() ?? ""
            const matches = scriptContent.matchAll(FIPI_SHOW_PICTURE_Q_REGEX)
            for (const match of matches) {
              attachments.push(`${FIPI_URL}/${match[1]}`)
            }
          })

          return { id: guid, name, prompt, body, solutionType, attachments }
        })
        .get()
        .filter(Boolean)

      const parsedGuids = parsedQuestions.map((q) => q.id)
      const existingQuestions = await ctx.db.question.findMany({
        where: { id: { in: parsedGuids } },
        select: { id: true },
      })
      const existingIds = new Set(existingQuestions.map((q) => q.id))

      const newQuestions = parsedQuestions.filter((q) => !existingIds.has(q.id))

      for (const question of newQuestions) {
        await ctx.db.question.create({
          data: {
            id: question.id,
            name: question.name,
            prompt: question.prompt,
            body: question.body,
            solutionType: question.solutionType,
            source: QuestionSource.FIPI,
            subjectId,
            creatorId: ctx.session?.user?.id,
            attachments: {
              create: question.attachments.map((url) => ({ url })),
            },
          },
        })
      }
      return { createdCount: newQuestions.length }
    }),
})
