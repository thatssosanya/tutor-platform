import "@/styles/globals.css"

import { type AppType } from "next/app"
import dynamic from "next/dynamic"
import { Geist } from "next/font/google"
import { useRouter } from "next/router"
import { type Session } from "next-auth"
import { SessionProvider } from "next-auth/react"
import React, { type PropsWithChildren } from "react"

import { SpinnerScreen } from "@/components/SpinnerScreen"
import { api } from "@/utils/api"

const geist = Geist({
  subsets: ["latin"],
})

const NoSsrComp = (props: PropsWithChildren<unknown>) => (
  <React.Fragment>{props.children}</React.Fragment>
)

const NoSsr = dynamic(() => Promise.resolve(NoSsrComp), {
  ssr: false,
})

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  const router = useRouter()
  return (
    <SessionProvider session={session}>
      <div className={geist.className}>
        <NoSsr>
          {router.isReady ? <Component {...pageProps} /> : <SpinnerScreen />}
        </NoSsr>
      </div>
    </SessionProvider>
  )
}

export default api.withTRPC(MyApp)
