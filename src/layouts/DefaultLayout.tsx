import { useSession } from "next-auth/react"
import React, { useEffect } from "react"

import { Header } from "@/components/Header"
import { cn } from "@/styles"
import { useRouter } from "next/router"

interface DefaultLayoutProps {
  children: React.ReactNode
}

const DefaultLayout: React.FC<DefaultLayoutProps> = ({ children }) => {
  const { status } = useSession()

  // TODO remove
  const router = useRouter()
  useEffect(() => {
    if (
      status === "unauthenticated" &&
      !["/", "/sign-in"].includes(router.pathname)
    ) {
      router.push("/")
    }
  }, [status, router])

  return (
    <div className={cn("relative flex min-h-screen flex-col bg-primary")}>
      {status === "authenticated" && <Header />}
      {children}
    </div>
  )
}

export default DefaultLayout
