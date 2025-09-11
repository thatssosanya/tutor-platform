import { humanId } from "human-id"
import { customAlphabet } from "nanoid"
import { z } from "zod"
import bcrypt from "bcryptjs"

import {
  createProtectedProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/server/api/trpc"
import { createPermissions, PermissionBit } from "@/utils/permissions"
import { Prisma } from "@prisma/client"
import { TRPCError } from "@trpc/server"

const generateStudentName = () => {
  return humanId({
    separator: "",
    capitalize: true,
  })
}

const generateStudentPassword = customAlphabet(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  8
)

export const userRouter = createTRPCRouter({
  // --- PROTECTED ---

  getProfile: protectedProcedure.query(({ ctx }) => {
    return ctx.db.user.findUniqueOrThrow({
      where: { id: ctx.session.user.id },
      select: {
        displayName: true,
        subjects: { select: { id: true } },
      },
    })
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        displayName: z.string().min(1),
        password: z.string().min(8).optional(),
        subjectIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { displayName, password, subjectIds } = input

      const updateData: Prisma.UserUpdateInput = {
        displayName,
        subjects: {
          set: subjectIds.map((id) => ({ id })),
        },
      }

      if (password && password.trim().length > 0) {
        updateData.password = await bcrypt.hash(password, 12)
      }

      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: updateData,
      })
    }),

  // --- FOR TUTORS ---

  getStudents: createProtectedProcedure([PermissionBit.TUTOR]).query(
    async ({ ctx }) => {
      return ctx.db.user.findMany({
        where: { creatorId: ctx.session.user.id },
        orderBy: { createdAt: "desc" },
      })
    }
  ),

  createStudent: createProtectedProcedure([PermissionBit.TUTOR])
    .input(
      z.object({
        displayName: z.string().min(1),
        subjectIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tutor = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        include: { subjects: { select: { id: true } } },
      })
      if (!tutor) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Аккаунт репетитора не найден.",
        })
      }

      const tutorSubjectIds = new Set(tutor.subjects.map((s) => s.id))
      const canAssignAll = input.subjectIds.every((id) =>
        tutorSubjectIds.has(id)
      )

      if (!canAssignAll) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Вы не можете назначить предмет, который не ведете.",
        })
      }

      const password = generateStudentPassword()
      let student = null
      let attempts = 0
      const maxAttempts = 5

      while (student === null && attempts < maxAttempts) {
        try {
          const name = generateStudentName()
          student = await ctx.db.user.create({
            data: {
              name,
              displayName: input.displayName,
              password,
              permissions: createPermissions([PermissionBit.STUDENT]),
              creatorId: ctx.session.user.id,
              subjects: {
                connect: input.subjectIds.map((id) => ({ id })),
              },
            },
          })
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002" // Unique constraint violation
          ) {
            attempts++
            if (attempts >= maxAttempts) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Не удалось сгенерировать уникальный логин.",
              })
            }
          } else {
            throw error
          }
        }
      }

      if (!student) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Не удалось создать ученика.",
        })
      }

      return student
    }),

  getStudent: createProtectedProcedure([PermissionBit.TUTOR])
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const student = await ctx.db.user.findUnique({
        where: { id: input.id },
      })

      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ученик не найден.",
        })
      }

      if (student.creatorId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Вы не можете просматривать этого ученика.",
        })
      }

      return student
    }),
})
