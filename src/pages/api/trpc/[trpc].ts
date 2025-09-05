import { createNextApiHandler } from "@trpc/server/adapters/next"

import { env } from "@/env"
import { appRouter } from "@/server/api/root"
import { createTRPCContext } from "@/server/api/trpc"

// export API handler
export default createNextApiHandler({
  router: appRouter,
  createContext: createTRPCContext,
  onError:
    env.NODE_ENV === "development"
      ? ({ path, error }) => {
          console.error(
            `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`
          )
        }
      : undefined,
  // broken type inference on build time for next > 15.5.x pages router
  // https://discord-questions.trpc.io/m/1409997624492294276
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any
