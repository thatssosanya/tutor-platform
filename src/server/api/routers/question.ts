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
        examPositions: z
          .union([
            z.boolean(),
            z.array(z.number()),
            z.array(z.string()),
            z.null(),
          ])
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
        examPositions,
        verified,
        solutionType,
        hasSolution,
        hasWork,
        hasHint,
        excludeIds,
      } = input
      const skip = (page - 1) * limit

      const whereClause: Prisma.QuestionWhereInput = {
        // model fields
        id:
          excludeIds && excludeIds.length > 0
            ? { notIn: excludeIds }
            : undefined,
        subjectId: subjectId,
        source: sources && sources.length > 0 ? { in: sources } : undefined,
        solutionType: solutionType,
        verified:
          verified === null || verified === undefined ? undefined : verified,
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

        // relational fields
        AND: [
          ...(topicIds && topicIds.length > 0
            ? [{ topics: { some: { topicId: { in: topicIds } } } }]
            : []),

          ...(examPositions === true
            ? [{ topics: { some: { topic: { examPosition: { not: null } } } } }]
            : examPositions === false
              ? [{ topics: { every: { topic: { examPosition: null } } } }]
              : Array.isArray(examPositions) && examPositions.length > 0
                ? typeof examPositions[0] === "string"
                  ? [
                      {
                        topics: {
                          some: {
                            topic: {
                              OR: [
                                { parentId: { in: examPositions as string[] } },
                                { id: { in: examPositions as string[] } },
                              ],
                            },
                          },
                        },
                      },
                    ]
                  : typeof examPositions[0] === "number"
                    ? [
                        {
                          topics: {
                            some: {
                              topic: {
                                examPosition: { in: examPositions as number[] },
                              },
                            },
                          },
                        },
                      ]
                    : []
                : []),
        ],
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
            topics: {
              select: {
                topic: {
                  select: { id: true, parentId: true, examPosition: true },
                },
              },
            },
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
        examPositionId: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id: questionId, examPositionId } = input

      return ctx.db.$transaction(async (tx) => {
        const question = await tx.question.findUnique({
          where: { id: questionId },
          select: {
            subjectId: true,
            topics: {
              select: {
                topicId: true,
                topic: { select: { examPosition: true } },
              },
            },
          },
        })

        if (!question) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Question with ID '${questionId}' not found.`,
          })
        }

        const targetTopic =
          examPositionId !== null
            ? await tx.topic.findUnique({
                where: {
                  id_subjectId: {
                    id: examPositionId,
                    subjectId: question.subjectId,
                  },
                },
                select: { parentId: true, examPosition: true },
              })
            : null

        const deleteData: Prisma.QuestionToTopicDeleteManyArgs = {
          where: {
            questionId,
            topic: {
              AND: [
                { examPosition: { not: null } },
                ...(targetTopic
                  ? [{ examPosition: { not: targetTopic.examPosition } }]
                  : []),
              ],
            },
          },
        }
        await tx.questionToTopic.deleteMany(deleteData)

        if (examPositionId === null) {
          return
        }

        const topicsToCreate: Prisma.QuestionToTopicCreateManyInput[] = []
        if (!targetTopic) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Topic with ID '${examPositionId}' not found.`,
          })
        }

        topicsToCreate.push({
          questionId,
          subjectId: question.subjectId,
          topicId: examPositionId,
        })

        if (targetTopic.parentId) {
          topicsToCreate.push({
            questionId,
            subjectId: question.subjectId,
            topicId: targetTopic.parentId,
          })
        }
        const createData = { data: topicsToCreate, skipDuplicates: true }
        return await tx.questionToTopic.createMany(createData)
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
