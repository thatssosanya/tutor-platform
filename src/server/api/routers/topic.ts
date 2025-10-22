import { z } from "zod"

import {
  createProtectedProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/server/api/trpc"
import { EXAM_POSITION_ID_PREFIX } from "@/utils/consts"
import { PermissionBit } from "@/utils/permissions"

export const topicRouter = createTRPCRouter({
  // --- PROTECTED ---

  getAllBySubject: protectedProcedure
    .input(
      z.object({
        subjectId: z.string(),
        examPosition: z.boolean().optional().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const topics = await ctx.db.topic.findMany({
        where: {
          subjectId: input.subjectId,
          examPosition: input.examPosition ? { not: null } : { equals: null },
        },
        orderBy: input.examPosition ? { examPosition: "asc" } : { name: "asc" },
      })

      if (input.examPosition) {
        topics.sort((a, b) => {
          const partsA = a.id
            .slice(EXAM_POSITION_ID_PREFIX.length)
            .split("-")
            .map(Number)
          const partsB = b.id
            .slice(EXAM_POSITION_ID_PREFIX.length)
            .split("-")
            .map(Number)

          const minLength = Math.min(partsA.length, partsB.length)

          for (let i = 0; i < minLength; i++) {
            if (partsA[i]! > partsB[i]!) {
              return 1
            } else if (partsA[i]! < partsB[i]!) {
              return -1
            }
          }

          return partsA.length - partsB.length
        })
      }

      return topics.map((t) => ({
        ...t,
        name:
          t.examPosition !== null && !t.parentId
            ? t.examPosition + ". " + t.name
            : t.name,
      }))
    }),

  // --- FOR ADMINS ---

  create: createProtectedProcedure([PermissionBit.ADMIN])
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        subjectId: z.string(),
        parentId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.topic.create({
        data: {
          id: input.id,
          name: input.name,
          subjectId: input.subjectId,
          parentId: input.parentId,
        },
      })
    }),

  update: createProtectedProcedure([PermissionBit.ADMIN])
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

  delete: createProtectedProcedure([PermissionBit.ADMIN])
    .input(z.object({ id: z.string(), subjectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.topic.delete({
        where: { id_subjectId: { id: input.id, subjectId: input.subjectId } },
      })
    }),
})
