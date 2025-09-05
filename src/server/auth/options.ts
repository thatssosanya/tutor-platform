import { type NextAuthConfig } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "@/server/db"
import type { CustomUser } from "@/types/next-auth"

const bcryptHashRegex = /^\$2[abxy]\$.{56}$/

const authOptions: NextAuthConfig = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        name: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials || !credentials.name) {
          throw new Error("Нужен логин, чтобы войти.")
        }
        if (!credentials || !credentials.password) {
          throw new Error("Нужен пароль, чтобы войти.")
        }

        const user = await db?.user.findFirst({
          where: { name: credentials.name },
        })

        if (!user) {
          throw new Error("Аккаунт с таким логином не найден.")
        }

        const isBcryptHash = bcryptHashRegex.test(user.password)
        let isValid = false

        if (isBcryptHash) {
          isValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          )
        } else {
          isValid = (credentials.password as string) === user.password
        }

        if (!isValid) {
          throw new Error("Неправильный пароль.")
        }

        return {
          id: user.id,
          name: user.name,
          displayName: user.displayName,
          permissions: user.permissions,
        }
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id ?? "MISSING_ID"
        token.name = user.name ?? "MISSING_NAME"
        token.displayName = user.displayName
        token.permissions = user.permissions
      }
      return token
    },
    session: async ({ session, token }) => {
      if (session) {
        session.user.id = token.id
        // custom name collides with default name type, so has to be coerced
        session.user.name = token.name as CustomUser["name"]
        session.user.displayName = token.displayName
        session.user.permissions = token.permissions
      }
      return session
    },
  },
  pages: {
    signIn: "/sign-in",
  },
}

export default authOptions
