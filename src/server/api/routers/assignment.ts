import { z } from "zod"

import { createProtectedProcedure, createTRPCRouter } from "@/server/api/trpc"
import { TRPCError } from "@trpc/server"
import { parseDateString as parseDateStringUtil } from "@/utils/date"
import { PermissionBit } from "@/utils/permissions"

const parseDateString = (dateStr: string | undefined | null): Date | null => {
  if (!dateStr) return null
  return parseDateStringUtil(dateStr)
}

export const assignmentRouter = createTRPCRouter({
  // --- FOR TUTORS ---

  create: createProtectedProcedure([PermissionBit.TUTOR])
    .input(
      z.object({
        testId: z.string(),
        assignedToId: z.string(),
        dueAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.assignment.create({
        data: {
          testId: input.testId,
          assignedToId: input.assignedToId,
          assignedById: ctx.session.user.id,
          dueAt: input.dueAt,
        },
      })
    }),

  getByTestId: createProtectedProcedure([PermissionBit.TUTOR])
    .input(z.object({ testId: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.db.assignment.findMany({
        where: {
          testId: input.testId,
          assignedById: ctx.session.user.id,
        },
      })
    }),

  updateAssignmentsForTest: createProtectedProcedure([PermissionBit.TUTOR])
    .input(
      z.object({
        testId: z.string(),
        assignments: z.array(
          z.object({
            studentId: z.string(),
            dueDate: z.string(), // "DD.MM" or empty string
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { testId, assignments } = input
      const assignedById = ctx.session.user.id

      const existingAssignments = await ctx.db.assignment.findMany({
        where: { testId, assignedById },
      })

      const existingMap = new Map(
        existingAssignments.map((a) => [a.assignedToId, a])
      )
      const newMap = new Map(assignments.map((a) => [a.studentId, a]))

      const toDeleteIds = existingAssignments
        .filter((a) => !newMap.has(a.assignedToId))
        .map((a) => a.id)

      const toCreate = assignments.filter((a) => !existingMap.has(a.studentId))

      const toUpdate = assignments.filter((a) => {
        if (!existingMap.has(a.studentId)) return false

        const existing = existingMap.get(a.studentId)!
        const newDueDate = parseDateString(a.dueDate)
        const existingDueDate = existing.dueAt

        if (existingDueDate === null && newDueDate === null) return false
        if (existingDueDate?.getTime() === newDueDate?.getTime()) return false

        return true
      })

      return ctx.db.$transaction(async (prisma) => {
        if (toDeleteIds.length > 0) {
          await prisma.assignment.deleteMany({
            where: { id: { in: toDeleteIds } },
          })
        }

        if (toCreate.length > 0) {
          await prisma.assignment.createMany({
            data: toCreate.map((a) => ({
              testId,
              assignedById,
              assignedToId: a.studentId,
              dueAt: parseDateString(a.dueDate),
            })),
          })
        }

        for (const assignment of toUpdate) {
          await prisma.assignment.update({
            where: { id: existingMap.get(assignment.studentId)!.id },
            data: {
              dueAt: parseDateString(assignment.dueDate),
            },
          })
        }
      })
    }),

  // --- FOR TUTORS | STUDENTS ---

  getStudentAssignments: createProtectedProcedure([
    PermissionBit.STUDENT,
    PermissionBit.TUTOR,
  ]).query(({ ctx }) => {
    return ctx.db.assignment.findMany({
      where: { assignedToId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
      include: { test: { select: { name: true, subject: true } } },
    })
  }),

  getStudentAssignmentsBySubject: createProtectedProcedure([
    PermissionBit.STUDENT,
    PermissionBit.TUTOR,
  ])
    .input(z.object({ subjectId: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.db.assignment.findMany({
        where: {
          assignedToId: ctx.session.user.id,
          test: {
            subjectId: input.subjectId,
          },
        },
        orderBy: { createdAt: "desc" },
        include: {
          test: {
            include: {
              _count: {
                select: {
                  questions: true,
                },
              },
            },
          },
        },
      })
    }),

  getById: createProtectedProcedure([
    PermissionBit.STUDENT,
    PermissionBit.TUTOR,
  ])
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const assignment = await ctx.db.assignment.findFirst({
        where: {
          id: input.id,
          assignedToId: ctx.session.user.id,
        },
        include: {
          answers: true,
          test: {
            include: {
              questions: {
                orderBy: { order: "asc" },
                include: {
                  question: {
                    include: { attachments: true },
                  },
                },
              },
            },
          },
        },
      })

      if (!assignment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Задание не найдено.",
        })
      }

      return assignment
    }),

  // --- FOR STUDENTS ---

  submitAnswers: createProtectedProcedure([PermissionBit.STUDENT])
    .input(
      z.object({
        assignmentId: z.string(),
        answers: z.array(
          z.object({
            questionId: z.string(),
            answer: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const assignment = await ctx.db.assignment.findFirst({
        where: {
          id: input.assignmentId,
          assignedToId: ctx.session.user.id,
        },
      })

      if (!assignment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Задание не найдено.",
        })
      }

      if (assignment.completedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Задание уже было выполнено.",
        })
      }

      return ctx.db.$transaction(async (prisma) => {
        await prisma.studentAnswer.createMany({
          data: input.answers.map((a) => ({
            assignmentId: input.assignmentId,
            questionId: a.questionId,
            answer: a.answer,
          })),
        })

        return prisma.assignment.update({
          where: { id: input.assignmentId },
          data: { completedAt: new Date() },
        })
      })
    }),
})
