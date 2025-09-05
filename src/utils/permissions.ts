import { useSession } from "next-auth/react"

export enum PermissionBit {
  ADMIN = 1 << 0, // 1
  TUTOR = 1 << 1, // 2
  STUDENT = 1 << 2, // 4
}

export function hasPermission(
  permissions: number,
  permission: PermissionBit
): boolean {
  if ((permissions & PermissionBit.ADMIN) === PermissionBit.ADMIN) {
    return true
  }
  return (permissions & permission) === permission
}

export function isTutor(permissions: number): boolean {
  return hasPermission(permissions, PermissionBit.TUTOR)
}

export function isStudent(permissions: number): boolean {
  return hasPermission(permissions, PermissionBit.STUDENT)
}

export function usePermissions() {
  const { data: session } = useSession()
  const permissions = session?.user?.permissions ?? 0

  return {
    isTutor: isTutor(permissions),
    isStudent: isStudent(permissions),
  }
}

export function createPermissions(permissions: PermissionBit[]): number {
  return permissions.reduce((acc, permission) => acc | permission, 0)
}

export function togglePermission(
  permissions: number,
  permission: PermissionBit,
  value: boolean
): number {
  if (value) {
    return permissions | permission
  } else {
    return permissions & ~permission
  }
}
