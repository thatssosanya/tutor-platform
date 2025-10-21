import { Prisma, QuestionSource, SolutionType } from "@prisma/client"
import { TRPCError } from "@trpc/server"
import { z } from "zod"

import {
  createProtectedProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/server/api/trpc"
import { verifyQuestion } from "@/server/lib/fipi"
import { enrichQuestionWithAI } from "@/server/services/ai/enrichment"
import { UNENRICHABLE_SOLUTION_TYPES } from "@/utils/consts"
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
          verified: true,
          creatorId: ctx.session.user.id,
          topics: {
            create: topicIds.map((id) => ({
              topic: {
                connect: {
                  id_subjectId: { id, subjectId: input.subjectId },
                },
              },
            })),
          },
        },
      })
    }),

  getPaginated: createProtectedProcedure([PermissionBit.TUTOR])
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        page: z.number().min(1).default(1),
        subjectId: z.string().optional(),
        topicIds: z.array(z.string()).optional(),
        sources: z.array(z.nativeEnum(QuestionSource)).optional(),
        search: z.string().optional(),
        examPosition: z
          .union([z.boolean(), z.number(), z.null()])
          .optional()
          .default(null),
        verified: z.boolean().nullable().optional().default(null),
        solutionType: z.nativeEnum(SolutionType).optional(),
        hasSolution: z.boolean().nullable().optional(),
        hasWork: z.boolean().nullable().optional(),
        hasHint: z.boolean().nullable().optional(),
        excludeIds: z.array(z.string()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const {
        limit,
        page,
        subjectId,
        topicIds,
        sources,
        search,
        examPosition,
        verified,
        solutionType,
        hasSolution,
        hasWork,
        hasHint,
        excludeIds,
      } = input
      const skip = (page - 1) * limit

      const whereClause: Prisma.QuestionWhereInput = {
        id:
          excludeIds && excludeIds.length > 0
            ? { notIn: excludeIds }
            : undefined,
        subjectId: subjectId,
        source: sources && sources.length > 0 ? { in: sources } : undefined,
        solutionType: solutionType,
        topics:
          topicIds && topicIds.length > 0
            ? { some: { topicId: { in: topicIds } } }
            : undefined,
        verified:
          verified === null || verified === undefined ? undefined : verified,
        examPosition:
          examPosition === null || examPosition === undefined
            ? undefined
            : typeof examPosition === "boolean"
              ? examPosition
                ? { not: null }
                : null
              : { equals: examPosition },
        solution:
          hasSolution === null || hasSolution === undefined
            ? undefined
            : hasSolution
              ? { not: null }
              : null,
        work:
          hasWork === null || hasWork === undefined
            ? undefined
            : hasWork
              ? { not: null }
              : null,
        hint:
          hasHint === null || hasHint === undefined
            ? undefined
            : hasHint
              ? { not: null }
              : null,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { prompt: { contains: search, mode: "insensitive" } },
                { body: { contains: search, mode: "insensitive" } },
              ],
            }
          : undefined),
      }

      const [items, totalCount] = await ctx.db.$transaction([
        ctx.db.question.findMany({
          take: limit,
          skip,
          where: whereClause,
          include: {
            subject: {
              select: {
                grade: true,
              },
            },
            attachments: true,
            options: true,
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

  update: createProtectedProcedure([PermissionBit.TUTOR])
    .input(questionInputSchema.extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { topicIds, ...questionData } = input

      return ctx.db.question.update({
        where: { id: input.id },
        data: {
          ...questionData,
          topics: {
            deleteMany: {},
            create: topicIds.map((topicId) => ({
              topic: {
                connect: {
                  id_subjectId: {
                    id: topicId,
                    subjectId: input.subjectId,
                  },
                },
              },
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

  // --- FOR ADMINS ---

  updateExamPosition: createProtectedProcedure([PermissionBit.ADMIN])
    .input(
      z.object({
        id: z.string(),
        examPosition: z.number().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.question.update({
        where: { id: input.id },
        data: { examPosition: input.examPosition },
      })
    }),

  updateContent: createProtectedProcedure([PermissionBit.ADMIN])
    .input(
      z.object({
        id: z.string(),
        body: z.string().optional(),
        solution: z.string().optional(),
        work: z.string().optional(),
        hint: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.db.question.update({
        where: { id },
        data: data,
      })
    }),

  enrichOne: createProtectedProcedure([PermissionBit.ADMIN])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const question = await ctx.db.question.findUnique({
        where: { id: input.id },
        include: {
          subject: {
            select: {
              grade: true,
            },
          },
          attachments: true,
          options: true,
        },
      })

      if (!question) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Question not found.",
        })
      }

      if (UNENRICHABLE_SOLUTION_TYPES.includes(question.solutionType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Enrichment is not available for ${UNENRICHABLE_SOLUTION_TYPES}.`,
        })
      }

      const aiEnrichment = await enrichQuestionWithAI(question)

      const verified = await verifyQuestion(
        question.id,
        question.subjectId,
        aiEnrichment.solution
      )

      return ctx.db.question.update({
        where: { id: input.id },
        data: {
          hint: aiEnrichment.hint,
          work: aiEnrichment.work,
          solution: aiEnrichment.solution,
          verified,
        },
      })
    }),

  enrichMany: createProtectedProcedure([PermissionBit.ADMIN])
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const questionsToEnrich = await ctx.db.question.findMany({
        where: {
          id: { in: input.ids },
          solutionType: {
            notIn: UNENRICHABLE_SOLUTION_TYPES,
          },
          OR: [{ solution: null }, { work: null }, { hint: null }],
        },
        include: {
          subject: {
            select: {
              grade: true,
            },
          },
          attachments: true,
          options: true,
        },
      })

      if (questionsToEnrich.length === 0) {
        return { enrichedCount: 0 }
      }

      const enrichmentPromises = questionsToEnrich.map(async (question) => {
        const aiEnrichment = await enrichQuestionWithAI(question)

        const verified = await verifyQuestion(
          question.id,
          question.subjectId,
          aiEnrichment.solution
        )

        return ctx.db.question.update({
          where: { id: question.id },
          data: {
            solution: aiEnrichment.solution,
            work: aiEnrichment.work,
            hint: aiEnrichment.hint,
            verified,
          },
        })
      })

      await Promise.all(enrichmentPromises)

      return { enrichedCount: questionsToEnrich.length }
    }),

  updateVerifications: createProtectedProcedure([PermissionBit.ADMIN])
    .input(z.object({ updates: z.record(z.string(), z.boolean()) }))
    .mutation(async ({ ctx, input }) => {
      const { updates } = input
      const updatePromises = Object.entries(updates).map(([id, verified]) =>
        ctx.db.question.update({
          where: { id },
          data: { verified },
        })
      )

      await ctx.db.$transaction(updatePromises)
      return { updatedCount: updatePromises.length }
    }),
})
