import tls from "node:tls"
import { Agent, fetch, FormData, type RequestInit, type Response } from "undici"
import { env } from "@/env"
import { FIPI_EGE_URL, FIPI_OGE_URL } from "@/utils/consts"

const fipiAgent = new Agent({
  connect: {
    ca: [...tls.rootCertificates, env.FIPI_INTERMEDIATE_CERT],
    keepAlive: true,
  },
})

const mergeCookies = (
  oldCookies: string | null,
  response: Response
): string => {
  const newCookies = response.headers.getSetCookie()
  if (!newCookies || newCookies.length === 0) return oldCookies || ""

  const cookieMap = new Map<string, string>()

  if (oldCookies) {
    oldCookies.split(";").forEach((c) => {
      const [k, v] = c.trim().split("=")
      if (k && v) cookieMap.set(k, v)
    })
  }

  newCookies.forEach((c) => {
    const parts = c.split(";")[0]?.split("=")
    if (!parts?.length) {
      return
    }
    if (parts.length >= 2) {
      cookieMap.set(parts[0]!.trim(), parts[1]!.trim())
    }
  })

  return Array.from(cookieMap.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ")
}

export const fetchFipiRaw = async (
  path: string,
  options: Partial<RequestInit> = {},
  grade: string = "11",
  cookies: string | null = null
) => {
  const fullPath = path.startsWith("http")
    ? path
    : (grade === "9" ? FIPI_OGE_URL : FIPI_EGE_URL) + path

  const headers: Record<string, string> = {
    accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "accept-language": "en-US,en;q=0.9",
    "user-agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
    "sec-ch-ua": '"Chromium";v="139", "Not;A=Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Linux"',
    "sec-fetch-dest": "iframe",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "same-origin",
    "sec-fetch-user": "?1",
    "upgrade-insecure-requests": "1",
    ...(options.headers as Record<string, string>),
  }

  if (cookies) {
    headers["Cookie"] = cookies
  }

  const response = await fetch(fullPath, {
    method: "GET",
    ...options,
    headers,
    dispatcher: fipiAgent,
  })

  if (!response.ok) throw new Error("Failed to fetch " + fullPath)

  return {
    response,
    nextCookies: mergeCookies(cookies, response),
  }
}

type FipiPageOptions = {
  grade?: string
  topicFilter?: {
    subjectId: string
    topicId: string
  }
}

export const fetchFipiPage = async (
  path: string,
  options: FipiPageOptions = {}
) => {
  const { grade = "11", topicFilter } = options
  let cookies: string | null = null

  if (topicFilter) {
    const init = await fetchFipiRaw(
      `/bank/questions.php?proj=${topicFilter.subjectId}`,
      {},
      grade
    )
    cookies = init.nextCookies

    const params = new URLSearchParams()
    params.append("search", "1")
    params.append("pagesize", "10")
    params.append("proj", topicFilter.subjectId)
    params.append("theme", topicFilter.topicId)

    const setup = await fetchFipiRaw(
      "/bank/questions.php",
      {
        method: "POST",
        body: params,
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
      },
      grade,
      cookies
    )

    cookies = setup.nextCookies
  }

  const { response } = await fetchFipiRaw(path, {}, grade, cookies)

  const buffer = await response.arrayBuffer()
  const decoder = new TextDecoder("windows-1251")
  return decoder.decode(buffer)
}

export const verifyQuestion = async (
  questionId: string,
  subjectId: string,
  grade?: string | null,
  solution?: string | null
) => {
  if (!solution) return false

  try {
    const { nextCookies } = await fetchFipiRaw(
      `/bank/questions.php?proj=${subjectId}`
    )

    const body = new FormData()
    body.append("guid", questionId)
    body.append("proj", subjectId)
    body.append("answer", solution)
    body.append("ajax", "1")

    const { response } = await fetchFipiRaw(
      "/bank/solve.php",
      {
        method: "POST",
        body,
      },
      grade ?? "11",
      nextCookies
    )

    const text = await response.text()
    if (text === "2" || text === "3") {
      return text === "3"
    }
    return false
  } catch (e) {
    console.error(e)
    return undefined
  }
}

export const FIPI_SHOW_PICTURE_Q_REGEX = /ShowPictureQ\(['"]([^'"]*?)['"].*\)/g
export const FIPI_ID_REGEX = /^\s*\d+(\.\d+)*\s*/
