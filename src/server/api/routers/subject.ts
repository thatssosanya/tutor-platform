import { z } from "zod"

import {
  createProtectedProcedure,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc"
import { PermissionBit } from "@/utils/permissions"

export const subjectRouter = createTRPCRouter({
  // --- PUBLIC ---

  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.db.subject.findMany({
      orderBy: { name: "asc" },
    })
  }),

  getAllByGrade: publicProcedure.query(async ({ ctx }) => {
    const subjects = await ctx.db.subject.findMany({
      orderBy: { name: "asc" },
    })
    const subjectsByGrade = subjects.reduce(
      (a, s) => {
        a[s.grade === "9" || s.grade === "11" ? s.grade : "undefined"]?.push(s)
        return a
      },
      { "9": [], "11": [], undefined: [] } as Record<string, typeof subjects>
    )
    return subjectsByGrade
  }),

  // --- PROTECTED ---

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.db.subject.findUnique({
        where: { id: input.id },
      })
    }),

  // --- FOR ADMINS ---

  create: createProtectedProcedure([PermissionBit.ADMIN])
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.subject.create({
        data: {
          name: input.name,
        },
      })
    }),

  update: createProtectedProcedure([PermissionBit.ADMIN])
    .input(z.object({ id: z.string(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.subject.update({
        where: { id: input.id },
        data: { name: input.name },
      })
    }),

  delete: createProtectedProcedure([PermissionBit.ADMIN])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.subject.delete({
        where: { id: input.id },
      })
    }),
})
