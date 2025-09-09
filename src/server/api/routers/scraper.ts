import { z } from "zod"

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import {
  parseQBlockFromHtml,
  scrapePage,
  scrapeSubjects,
  scrapeTopics,
} from "@/server/services/scraper"

export const scraperRouter = createTRPCRouter({
  scrapeSubjects: protectedProcedure.mutation(async ({ ctx }) => {
    return scrapeSubjects(ctx.db)
  }),

  scrapeTopics: protectedProcedure
    .input(z.object({ subjectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return scrapeTopics(ctx.db, input.subjectId)
    }),

  scrapePage: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1),
        subjectId: z.string(),
      })
    )
    .mutation(async ({ ctx, input: { subjectId, page } }) => {
      return scrapePage(ctx.db, subjectId, page, ctx.session.user)
    }),

  parseQBlock: protectedProcedure
    .input(z.object({ html: z.string() }))
    .mutation(({ input }) => {
      return parseQBlockFromHtml(input.html)
    }),
})
