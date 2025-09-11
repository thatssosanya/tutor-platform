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
