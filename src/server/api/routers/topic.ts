import { z } from "zod"

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc"

export const topicRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        subjectId: z.string(),
        parentId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.topic.create({
        data: {
          name: input.name,
          subjectId: input.subjectId,
          parentId: input.parentId,
        },
      })
    }),

  getAllBySubject: publicProcedure
    .input(z.object({ subjectId: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.db.topic.findMany({
        where: { subjectId: input.subjectId },
        orderBy: { name: "asc" },
      })
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        subjectId: z.string(),
        name: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.topic.update({
        where: { id_subjectId: { id: input.id, subjectId: input.subjectId } },
        data: { name: input.name },
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string(), subjectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.topic.delete({
        where: { id_subjectId: { id: input.id, subjectId: input.subjectId } },
      })
    }),
})
