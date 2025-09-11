import { useSession } from "next-auth/react"
import { useRouter } from "next/router"
import React, { useEffect } from "react"

import { Container, Spinner } from "@/ui"
import { hasPermission, type PermissionBit } from "@/utils/permissions"

import DefaultLayout from "./DefaultLayout"

interface ProtectedLayoutProps {
  children: React.ReactNode
  permissionBits?: PermissionBit[]
}

const ProtectedLayout: React.FC<ProtectedLayoutProps> = ({
  children,
  permissionBits,
}) => {
  const { data: session, status } = useSession()
  const router = useRouter()

  const userPermissions = session?.user?.permissions ?? 0
  const isPermitted =
    !permissionBits?.length ||
    permissionBits.some((bit) => hasPermission(userPermissions, bit))

  useEffect(() => {
    if (status === "loading") {
      return
    }
    if (
      status === "unauthenticated" ||
      (status === "authenticated" && !isPermitted)
    ) {
      void router.push("/sign-in")
    }
  }, [status, isPermitted, router])

  if (status === "authenticated" && isPermitted) {
    return <DefaultLayout>{children}</DefaultLayout>
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-primary">
      <Container className="flex items-center justify-center">
        <Spinner />
      </Container>
    </div>
  )
}

export default ProtectedLayout
