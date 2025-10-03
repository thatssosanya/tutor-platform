import { useSession } from "next-auth/react"
import { useRouter } from "next/router"
import React, { useEffect } from "react"

import { Container, Spinner } from "@/ui"
import { hasPermission, type PermissionBit } from "@/utils/permissions"

import DefaultLayout from "./DefaultLayout"
import { SpinnerScreen } from "@/components/SpinnerScreen"

interface ProtectedLayoutProps {
  children: React.ReactNode
  permissionBits?: PermissionBit[]
  fullscreen?: boolean
}

const ProtectedLayout: React.FC<ProtectedLayoutProps> = ({
  children,
  permissionBits,
  fullscreen,
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
    return <DefaultLayout fullscreen={fullscreen}>{children}</DefaultLayout>
  }

  return <SpinnerScreen />
}

export default ProtectedLayout
