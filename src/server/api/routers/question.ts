import { z } from "zod"
import { QuestionSource, SolutionType } from "@prisma/client"

import {
  createProtectedProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/server/api/trpc"
import { TRPCError } from "@trpc/server"
import { enrichQuestionWithAI } from "@/server/services/ai"
import { PermissionBit } from "@/utils/permissions"

const questionInputSchema = z.object({
  name: z.string().min(1),
  prompt: z.string(),
  body: z.string().optional(),
  solutionPostfix: z.string().optional(),
  work: z.string().optional(),
  solution: z.string().optional(),
  solutionType: z.nativeEnum(SolutionType),
  source: z.nativeEnum(QuestionSource).default("USER"),
  subjectId: z.string(),
  topicIds: z.array(z.string()),
})

export const questionRouter = createTRPCRouter({
  // --- PROTECTED ---

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.db.question.findUnique({
        where: { id: input.id },
        include: { topics: true, attachments: true, options: true },
      })
    }),

  // --- FOR TUTORS ---

  create: createProtectedProcedure([PermissionBit.TUTOR])
    .input(questionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { topicIds, ...cleanInput } = input
      return ctx.db.question.create({
        data: {
          ...cleanInput,
          creatorId: ctx.session.user.id,
          topics: {
            connect: topicIds.map((id) => ({
              id_subjectId: { id, subjectId: input.subjectId },
            })),
          },
        },
      })
    }),

  getWithOffset: createProtectedProcedure([PermissionBit.TUTOR])
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        page: z.number().min(1).default(1),
        subjectId: z.string().optional(),
        topicIds: z.array(z.string()).optional(),
        source: z.nativeEnum(QuestionSource).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, page, subjectId, topicIds, source } = input
      const skip = (page - 1) * limit

      const whereClause = {
        subjectId: subjectId,
        source: source,
        topics:
          topicIds && topicIds.length > 0
            ? { some: { id: { in: topicIds } } }
            : undefined,
      }

      const [items, totalCount] = await ctx.db.$transaction([
        ctx.db.question.findMany({
          take: limit,
          skip,
          where: whereClause,
          include: {
            attachments: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        }),
        ctx.db.question.count({
          where: whereClause,
        }),
      ])

      const totalPages = Math.ceil(totalCount / limit)

      return {
        items,
        totalPages,
        currentPage: page,
      }
    }),

  getPaginated: createProtectedProcedure([PermissionBit.TUTOR])
    .input(
      z.object({
        limit: z.number().min(1).max(100).nullish(),
        cursor: z.string().nullish(),
        subjectId: z.string().optional(),
        topicIds: z.array(z.string()).optional(),
        source: z.nativeEnum(QuestionSource).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const limit = input.limit ?? 10
      const { cursor } = input

      const items = await ctx.db.question.findMany({
        take: limit + 1,
        where: {
          subjectId: input.subjectId,
          source: input.source,
          topics:
            input.topicIds && input.topicIds.length > 0
              ? { some: { id: { in: input.topicIds } } }
              : undefined,
        },
        include: {
          attachments: true,
        },
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: {
          createdAt: "asc",
        },
      })

      let nextCursor: typeof cursor | undefined = undefined
      if (items.length > limit) {
        const nextItem = items.pop()
        nextCursor = nextItem!.id
      }

      return {
        items,
        nextCursor,
      }
    }),

  update: createProtectedProcedure([PermissionBit.TUTOR])
    .input(questionInputSchema.extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.question.update({
        where: { id: input.id },
        data: {
          ...input,
          topics: {
            set: input.topicIds.map((id) => ({
              id_subjectId: { id, subjectId: input.subjectId },
            })),
          },
        },
      })
    }),

  delete: createProtectedProcedure([PermissionBit.TUTOR])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.question.delete({ where: { id: input.id } })
    }),

  enrichOne: createProtectedProcedure([PermissionBit.ADMIN])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const question = await ctx.db.question.findUnique({
        where: { id: input.id },
        select: { body: true, solutionType: true },
      })

      if (!question) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Question not found.",
        })
      }

      if (question.solutionType !== SolutionType.SHORT) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Enrichment is only available for SHORT answer questions.",
        })
      }

      const aiEnrichment = await enrichQuestionWithAI(question)

      return ctx.db.question.update({
        where: { id: input.id },
        data: {
          work: aiEnrichment.work,
          solution: aiEnrichment.solution,
        },
      })
    }),

  enrichMany: createProtectedProcedure([PermissionBit.ADMIN])
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const questionsToEnrich = await ctx.db.question.findMany({
        where: {
          id: { in: input.ids },
          solutionType: SolutionType.SHORT,
          work: null, // Only enrich those that need it
        },
        select: { id: true, body: true, solutionType: true },
      })

      if (questionsToEnrich.length === 0) {
        return { enrichedCount: 0 }
      }

      const enrichmentPromises = questionsToEnrich.map(async (question) => {
        const aiEnrichment = await enrichQuestionWithAI(question)
        return ctx.db.question.update({
          where: { id: question.id },
          data: {
            work: aiEnrichment.work,
            solution: aiEnrichment.solution,
          },
        })
      })

      await Promise.all(enrichmentPromises)

      return { enrichedCount: questionsToEnrich.length }
    }),
})
