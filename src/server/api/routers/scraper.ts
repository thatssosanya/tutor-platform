import { z } from "zod"

import { createProtectedProcedure, createTRPCRouter } from "@/server/api/trpc"
import {
  parseQBlockFromHtml,
  scrapePage,
  scrapeSubjects,
  scrapeTopics,
} from "@/server/services/scraper"
import { PermissionBit } from "@/utils/permissions"

export const scraperRouter = createTRPCRouter({
  // --- FOR ADMINS ---

  scrapeSubjects: createProtectedProcedure([PermissionBit.ADMIN])
    .input(z.object({ grade: z.string().default("11") }))
    .mutation(async ({ ctx, input }) => {
      return scrapeSubjects(ctx.db, input.grade)
    }),

  scrapeTopics: createProtectedProcedure([PermissionBit.ADMIN])
    .input(z.object({ subjectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return scrapeTopics(ctx.db, input.subjectId)
    }),

  scrapePage: createProtectedProcedure([PermissionBit.ADMIN])
    .input(
      z.object({
        page: z.number().min(1),
        subjectId: z.string(),
        topicId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input: { subjectId, page, topicId } }) => {
      return scrapePage(ctx.db, subjectId, page, topicId, ctx.session.user)
    }),

  parseQBlock: createProtectedProcedure([PermissionBit.ADMIN])
    .input(z.object({ html: z.string() }))
    .mutation(({ input }) => {
      return parseQBlockFromHtml(input.html)
    }),
})
