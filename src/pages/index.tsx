import Head from "next/head"
import { useRouter } from "next/router"
import { useSession } from "next-auth/react"
import { useEffect } from "react"

import { SpinnerScreen } from "@/components/SpinnerScreen"
import ProtectedLayout from "@/layouts/ProtectedLayout"
import { isStudent, isTutor } from "@/utils/permissions"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // TODO custom hook
  useEffect(() => {
    if (status === "authenticated" && session) {
      const permissions = session.user.permissions ?? 0
      if (isTutor(permissions)) {
        void router.push("/tutor/questions")
      } else if (isStudent(permissions)) {
        void router.push("/student/assignments")
      } else {
        // TODO add no permissions page
      }
    }
  }, [status, session, router])

  return (
    <>
      <Head>
        <title>Tutor Platform</title>
      </Head>
      <ProtectedLayout>
        <SpinnerScreen />
      </ProtectedLayout>
    </>
  )
}
