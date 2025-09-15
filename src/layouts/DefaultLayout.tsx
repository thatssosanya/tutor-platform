import { useSession } from "next-auth/react"
import React from "react"

import { Header } from "@/components/Header"
import { cn } from "@/styles"

interface DefaultLayoutProps {
  children: React.ReactNode
  fullscreen?: boolean
}

const DefaultLayout: React.FC<DefaultLayoutProps> = ({
  children,
  fullscreen,
}) => {
  const { status } = useSession()

  return (
    <div
      className={cn(
        "relative flex flex-col min-h-screen bg-primary",
        fullscreen ? "max-h-screen overflow-y-clip" : "pt-24"
      )}
    >
      {status === "authenticated" && <Header />}
      {children}
    </div>
  )
}

export default DefaultLayout
