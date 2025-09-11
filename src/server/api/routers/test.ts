import { z } from "zod"

import {
  createProtectedProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/server/api/trpc"
import { PermissionBit } from "@/utils/permissions"

const questionEntrySchema = z.object({
  questionId: z.string(),
  order: z.number().int(),
})

export const testRouter = createTRPCRouter({
  // --- PROTECTED ---

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.db.test.findUnique({
        where: { id: input.id },
        include: {
          questions: {
            orderBy: { order: "asc" },
            include: {
              question: true,
            },
          },
        },
      })
    }),

  // --- FOR TUTORS ---

  create: createProtectedProcedure([PermissionBit.TUTOR])
    .input(
      z.object({
        name: z.string().min(1),
        subjectId: z.string(),
        questions: z.array(questionEntrySchema).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (prisma) => {
        const test = await prisma.test.create({
          data: {
            name: input.name,
            subjectId: input.subjectId,
            creatorId: ctx.session.user.id,
          },
        })

        await prisma.testQuestion.createMany({
          data: input.questions.map((q) => ({
            testId: test.id,
            questionId: q.questionId,
            order: q.order,
          })),
        })

        return test
      })
    }),

  getAllBySubject: createProtectedProcedure([PermissionBit.TUTOR])
    .input(z.object({ subjectId: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.db.test.findMany({
        where: { subjectId: input.subjectId, creatorId: ctx.session.user.id },
        include: {
          _count: { select: { questions: true } },
        },
        orderBy: { updatedAt: "desc" },
      })
    }),

  getTestsContainingQuestion: createProtectedProcedure([PermissionBit.TUTOR])
    .input(z.object({ questionId: z.string(), subjectId: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.db.test.findMany({
        where: {
          creatorId: ctx.session.user.id,
          subjectId: input.subjectId,
          questions: {
            some: {
              questionId: input.questionId,
            },
          },
        },
        select: {
          id: true,
        },
      })
    }),

  update: createProtectedProcedure([PermissionBit.TUTOR])
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        subjectId: z.string(),
        questions: z.array(questionEntrySchema).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (prisma) => {
        await prisma.testQuestion.deleteMany({
          where: { testId: input.id },
        })

        await prisma.testQuestion.createMany({
          data: input.questions.map((q) => ({
            testId: input.id,
            questionId: q.questionId,
            order: q.order,
          })),
        })

        return prisma.test.update({
          where: { id: input.id },
          data: {
            name: input.name,
            subjectId: input.subjectId,
          },
        })
      })
    }),

  updateQuestions: createProtectedProcedure([PermissionBit.TUTOR])
    .input(
      z.object({
        testId: z.string(),
        questionIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (prisma) => {
        await prisma.testQuestion.deleteMany({
          where: { testId: input.testId },
        })

        if (input.questionIds.length > 0) {
          await prisma.testQuestion.createMany({
            data: input.questionIds.map((id, index) => ({
              testId: input.testId,
              questionId: id,
              order: index,
            })),
          })
        }

        return prisma.test.findUnique({ where: { id: input.testId } })
      })
    }),

  toggleQuestion: createProtectedProcedure([PermissionBit.TUTOR])
    .input(
      z.object({
        testId: z.string(),
        questionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { testId, questionId } = input
      const existing = await ctx.db.testQuestion.findUnique({
        where: {
          testId_questionId: { testId, questionId },
        },
      })

      if (existing) {
        await ctx.db.testQuestion.delete({ where: { id: existing.id } })
        return { status: "removed" }
      } else {
        const maxOrder = await ctx.db.testQuestion.aggregate({
          _max: { order: true },
          where: { testId },
        })
        const newOrder = (maxOrder._max.order ?? -1) + 1
        await ctx.db.testQuestion.create({
          data: { testId, questionId, order: newOrder },
        })
        return { status: "added" }
      }
    }),

  updateQuestionInTests: createProtectedProcedure([PermissionBit.TUTOR])
    .input(
      z.object({
        questionId: z.string(),
        testIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { questionId, testIds: newTestIds } = input

      const existingTestQuestions = await ctx.db.testQuestion.findMany({
        where: {
          questionId,
          test: { creatorId: ctx.session.user.id },
        },
      })
      const existingTestIds = existingTestQuestions.map((tq) => tq.testId)

      const testIdsToDeleteFrom = existingTestIds.filter(
        (id) => !newTestIds.includes(id)
      )
      const testIdsToAddTo = newTestIds.filter(
        (id) => !existingTestIds.includes(id)
      )

      return ctx.db.$transaction(async (prisma) => {
        if (testIdsToDeleteFrom.length > 0) {
          await prisma.testQuestion.deleteMany({
            where: {
              questionId,
              testId: { in: testIdsToDeleteFrom },
            },
          })
        }

        for (const testId of testIdsToAddTo) {
          const maxOrder = await prisma.testQuestion.aggregate({
            _max: { order: true },
            where: { testId },
          })
          const newOrder = (maxOrder._max.order ?? -1) + 1
          await prisma.testQuestion.create({
            data: { testId, questionId, order: newOrder },
          })
        }
      })
    }),

  delete: createProtectedProcedure([PermissionBit.TUTOR])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.test.delete({
        where: { id: input.id },
      })
    }),
})
