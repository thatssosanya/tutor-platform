import { useSession } from "next-auth/react"
import React from "react"

import { Header } from "@/components/Header"
import { cn } from "@/styles"

interface DefaultLayoutProps {
  children: React.ReactNode
}

const DefaultLayout: React.FC<DefaultLayoutProps> = ({ children }) => {
  const { status } = useSession()

  return (
    <div className={cn("relative flex min-h-screen flex-col bg-primary")}>
      {status === "authenticated" && <Header />}
      {children}
    </div>
  )
}

export default DefaultLayout
