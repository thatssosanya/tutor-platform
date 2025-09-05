import { createTRPCRouter } from "@/server/api/trpc"
import { scraperRouter } from "@/server/api/routers/scraper"
import { topicRouter } from "./routers/topic"
import { questionRouter } from "./routers/question"
import { subjectRouter } from "./routers/subject"
import { testRouter } from "./routers/test"
import { assignmentRouter } from "./routers/assignment"
import { userRouter } from "./routers/user"

export const appRouter = createTRPCRouter({
  scraper: scraperRouter,
  subject: subjectRouter,
  topic: topicRouter,
  question: questionRouter,
  test: testRouter,
  assignment: assignmentRouter,
  user: userRouter,
})

export type AppRouter = typeof appRouter
