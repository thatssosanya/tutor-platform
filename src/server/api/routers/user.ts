import { humanId } from "human-id"
import { customAlphabet } from "nanoid"
import { z } from "zod"

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { createPermissions, isTutor, PermissionBit } from "@/utils/permissions"
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
  getStudents: protectedProcedure.query(async ({ ctx }) => {
    if (!isTutor(ctx.session.user.permissions)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "У вас нет прав для просмотра списка учеников.",
      })
    }

    return ctx.db.user.findMany({
      where: { creatorId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
    })
  }),

  createStudent: protectedProcedure
    .input(z.object({ displayName: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (!isTutor(ctx.session.user.permissions)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "У вас нет прав для создания учеников.",
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

  getStudent: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!isTutor(ctx.session.user.permissions)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "У вас нет прав для просмотра информации об ученике.",
        })
      }

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
