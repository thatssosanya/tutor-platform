import { useSession } from "next-auth/react"
import React from "react"

import { Header } from "@/components/Header"
import { cn } from "@/styles"
import { useRouter } from "next/router"

interface DefaultLayoutProps {
  children: React.ReactNode
}

const DefaultLayout: React.FC<DefaultLayoutProps> = ({ children }) => {
  const { status } = useSession()
  const isAuthenticated = status === "authenticated"

  // TODO remove
  const router = useRouter()
  if (!isAuthenticated && !["/", "/sign-in"].includes(router.pathname)) {
    router.push("/")
  }

  return (
    <div className={cn("relative flex min-h-screen flex-col bg-primary")}>
      {isAuthenticated && <Header />}
      {children}
    </div>
  )
}

export default DefaultLayout
