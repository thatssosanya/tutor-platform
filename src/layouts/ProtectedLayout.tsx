import { useRouter } from "next/router"
import { useSession } from "next-auth/react"
import React, { useEffect } from "react"

import { SpinnerScreen } from "@/components/SpinnerScreen"
import { hasPermission, type PermissionBit } from "@/utils/permissions"

import DefaultLayout from "./DefaultLayout"

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
