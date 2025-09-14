import { LogOut } from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import Link from "next/link"
import { useRouter } from "next/router"
import React from "react"

import { cn } from "@/styles"
import { Button, Container, Row } from "@/ui"
import { usePermissions } from "@/utils/permissions"

const tutorLinks = [
  { href: "/tutor/questions", label: "Вопросы" },
  { href: "/tutor/tests", label: "Тесты" },
  { href: "/tutor/students", label: "Ученики" },
]

const studentLinks = [{ href: "/student/assignments", label: "Задания" }]

const adminLink = { href: "/admin", label: "Админ" }

export function Header() {
  const { data: session } = useSession()
  const router = useRouter()
  const { isTutor, isAdmin } = usePermissions()

  const links = isTutor ? tutorLinks : studentLinks
  const user = session?.user

  if (!user) return null

  const handleSignOut = async () => {
    signOut()
  }

  return (
    <header className="fixed top-0 z-40 w-full border-b border-primary bg-paper/80 backdrop-blur mb-4 md:mb-8">
      <Container className="flex h-16 items-center flex-row py-4 md:pb-4">
        <Row className="flex-1 gap-6">
          <nav className="flex items-center gap-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  router.pathname.startsWith(link.href)
                    ? "text-primary"
                    : "text-secondary"
                )}
              >
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                key={adminLink.href}
                href={adminLink.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  router.pathname.startsWith(adminLink.href)
                    ? "text-primary"
                    : "text-secondary"
                )}
              >
                {adminLink.label}
              </Link>
            )}
          </nav>
        </Row>

        <Row className="flex-1 justify-end gap-4">
          <Link
            href="/account"
            className="text-sm font-medium text-secondary transition-colors hover:text-primary"
          >
            {user.displayName ?? user.name}
          </Link>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleSignOut}
            aria-label="Выйти"
            shadows="none"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </Row>
      </Container>
    </header>
  )
}
