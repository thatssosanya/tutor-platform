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

  scrapeSubjects: createProtectedProcedure([PermissionBit.ADMIN]).mutation(
    async ({ ctx }) => {
      return scrapeSubjects(ctx.db)
    }
  ),

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
      })
    )
    .mutation(async ({ ctx, input: { subjectId, page } }) => {
      return scrapePage(ctx.db, subjectId, page, ctx.session.user)
    }),

  parseQBlock: createProtectedProcedure([PermissionBit.ADMIN])
    .input(z.object({ html: z.string() }))
    .mutation(({ input }) => {
      return parseQBlockFromHtml(input.html)
    }),
})
