import { z } from "zod"

import { createProtectedProcedure, createTRPCRouter } from "@/server/api/trpc"
import { TRPCError } from "@trpc/server"
import { parseDateString as parseDateStringUtil } from "@/utils/date"
import { PermissionBit } from "@/utils/permissions"
import { SolutionType } from "@prisma/client"

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

  getByTestIdWithStudent: createProtectedProcedure([PermissionBit.TUTOR])
    .input(z.object({ testId: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.db.assignment.findMany({
        where: {
          testId: input.testId,
          assignedById: ctx.session.user.id,
        },
        include: {
          assignedTo: {
            select: {
              displayName: true,
            },
          },
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

  delete: createProtectedProcedure([PermissionBit.TUTOR])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await ctx.db.assignment.findFirst({
        where: { id: input.id, assignedById: ctx.session.user.id },
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
          message: "Нельзя удалить выполненное задание.",
        })
      }

      return ctx.db.assignment.delete({
        where: { id: input.id },
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

  // TODO deprecate
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
        include: {
          test: {
            include: {
              questions: {
                include: {
                  question: {
                    select: { id: true, solution: true, solutionType: true },
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

      if (assignment.completedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Задание уже было выполнено.",
        })
      }

      const questionSolutions = new Map<
        string,
        { solution: string | null; solutionType: SolutionType }
      >()
      assignment.test.questions.forEach((q) => {
        questionSolutions.set(q.questionId, {
          solution: q.question.solution,
          solutionType: q.question.solutionType,
        })
      })

      const answersWithCorrectness = input.answers.map((ans) => {
        const questionInfo = questionSolutions.get(ans.questionId)
        let isCorrect: boolean = false

        if (
          questionInfo &&
          questionInfo.solutionType === SolutionType.SHORT &&
          questionInfo.solution
        ) {
          isCorrect =
            ans.answer.trim().toLowerCase() ===
            questionInfo.solution.trim().toLowerCase()
        }

        return {
          assignmentId: input.assignmentId,
          questionId: ans.questionId,
          answer: ans.answer,
          isCorrect,
        }
      })

      return ctx.db.$transaction(async (prisma) => {
        // Since answers can be updated, we use upsert
        for (const ans of answersWithCorrectness) {
          await prisma.studentAnswer.upsert({
            where: {
              assignmentId_questionId: {
                assignmentId: ans.assignmentId,
                questionId: ans.questionId,
              },
            },
            update: {
              answer: ans.answer,
              isCorrect: ans.isCorrect,
            },
            create: ans,
          })
        }

        return prisma.assignment.update({
          where: { id: input.assignmentId },
          data: { completedAt: new Date() },
        })
      })
    }),

  submitSingleAnswer: createProtectedProcedure([PermissionBit.STUDENT])
    .input(
      z.object({
        assignmentId: z.string(),
        questionId: z.string(),
        answer: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { assignmentId, questionId, answer } = input

      const assignment = await ctx.db.assignment.findFirst({
        where: { id: assignmentId, assignedToId: ctx.session.user.id },
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
          message: "Задание уже выполнено.",
        })
      }

      const question = await ctx.db.question.findUnique({
        where: { id: questionId },
        select: { solution: true, solutionType: true },
      })

      if (!question) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Вопрос не найден." })
      }

      let isCorrect = false
      if (question.solutionType === SolutionType.SHORT && question.solution) {
        isCorrect =
          answer.trim().toLowerCase() === question.solution.trim().toLowerCase()
      }

      const studentAnswerData = {
        assignmentId,
        questionId,
        answer,
        isCorrect,
      }

      return ctx.db.studentAnswer.upsert({
        where: {
          assignmentId_questionId: {
            assignmentId,
            questionId,
          },
        },
        update: studentAnswerData,
        create: studentAnswerData,
      })
    }),

  completeAssignment: createProtectedProcedure([PermissionBit.STUDENT])
    .input(z.object({ assignmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await ctx.db.assignment.findFirst({
        where: { id: input.assignmentId, assignedToId: ctx.session.user.id },
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

      return ctx.db.assignment.update({
        where: { id: input.assignmentId },
        data: { completedAt: new Date() },
      })
    }),
})
