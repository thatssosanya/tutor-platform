import { z } from "zod"
import { QuestionSource, SolutionType } from "@prisma/client"

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc"

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
  create: protectedProcedure
    .input(questionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { topicIds, ...cleanInput } = input
      return ctx.db.question.create({
        data: {
          ...cleanInput,
          creatorId: ctx.session.user.id,
          topics: {
            connect: topicIds.map((id) => ({
              id_subjectId: { id, subjectId: input.subjectId },
            })),
          },
        },
      })
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.db.question.findUnique({
        where: { id: input.id },
        include: { topics: true, attachments: true, options: true },
      })
    }),

  getWithOffset: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        page: z.number().min(1).default(1),
        subjectId: z.string().optional(),
        topicIds: z.array(z.string()).optional(),
        source: z.nativeEnum(QuestionSource).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, page, subjectId, topicIds, source } = input
      const skip = (page - 1) * limit

      const whereClause = {
        subjectId: subjectId,
        source: source,
        topics:
          topicIds && topicIds.length > 0
            ? { some: { id: { in: topicIds } } }
            : undefined,
      }

      // Fetch items for the current page and total count in a single transaction
      const [items, totalCount] = await ctx.db.$transaction([
        ctx.db.question.findMany({
          take: limit,
          skip,
          where: whereClause,
          include: {
            attachments: true,
          },
          orderBy: {
            createdAt: "desc",
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

  getPaginated: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).nullish(),
        cursor: z.string().nullish(),
        subjectId: z.string().optional(),
        topicIds: z.array(z.string()).optional(),
        source: z.nativeEnum(QuestionSource).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const limit = input.limit ?? 10
      const { cursor } = input

      const items = await ctx.db.question.findMany({
        take: limit + 1,
        where: {
          subjectId: input.subjectId,
          source: input.source,
          topics:
            input.topicIds && input.topicIds.length > 0
              ? { some: { id: { in: input.topicIds } } }
              : undefined,
        },
        include: {
          attachments: true,
        },
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: {
          createdAt: "desc",
        },
      })

      let nextCursor: typeof cursor | undefined = undefined
      if (items.length > limit) {
        const nextItem = items.pop()
        nextCursor = nextItem!.id
      }

      return {
        items,
        nextCursor,
      }
    }),

  update: protectedProcedure
    .input(questionInputSchema.extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.question.update({
        where: { id: input.id },
        data: {
          ...input,
          topics: {
            set: input.topicIds.map((id) => ({
              id_subjectId: { id, subjectId: input.subjectId },
            })),
          },
        },
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.question.delete({ where: { id: input.id } })
    }),
})
