import { type Session, type User } from "next-auth"
import { type JWT } from "next-auth/jwt"
import { type User as UserRecord } from "@prisma/client"

interface CustomUser {
  id: UserRecord["id"]
  name: UserRecord["name"]
  displayName: UserRecord["displayName"]
  permissions: UserRecord["permissions"]
}

declare module "next-auth" {
  interface User extends CustomUser {}
  interface Session {
    user: CustomUser
  }
}

declare module "next-auth/jwt" {
  interface JWT extends CustomUser {}
}
