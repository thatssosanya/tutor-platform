import tls from "node:tls"

import { Agent, fetch, FormData, type RequestInit } from "undici"

import { env } from "@/env"
import { FIPI_EGE_URL, FIPI_OGE_URL } from "@/utils/consts"

export const fetchFipi = async (
  path: string,
  options: Partial<RequestInit> = {},
  grade: string = "11"
) => {
  const fullPath = path.startsWith("http")
    ? path
    : (grade === "9" ? FIPI_OGE_URL : FIPI_EGE_URL) + path

  const fipiAgent = new Agent({
    connect: {
      ca: [...tls.rootCertificates, env.FIPI_INTERMEDIATE_CERT],
    },
  })

  const { headers, ...restOptions } = options

  const response = await fetch(fullPath, {
    method: "GET",
    ...restOptions,
    headers: {
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
      ...headers,
    },
    dispatcher: fipiAgent,
  })

  if (!response.ok) throw new Error("Failed to fetch " + fullPath)

  return response
}

export const fetchFipiPage = async (path: string, grade?: string) => {
  const response = await fetchFipi(path, undefined, grade)

  const buffer = await response.arrayBuffer()
  const decoder = new TextDecoder("windows-1251")
  const html = decoder.decode(buffer)

  return html
}

export const verifyQuestion = async (
  questionId: string,
  subjectId: string,
  solution?: string
) => {
  // TODO add puppeteer
  if (questionId) {
    return false
  }
  try {
    const body = new FormData()
    body.append("guid", questionId)
    body.append("proj", subjectId)
    body.append("answer", solution)
    body.append("ajax", "1")
    const options = {
      method: "POST",
      body,
      credentials: "include" as const,
    }
    const response = await fetchFipi("/bank/solve.php", options)
    const text = await response.text()
    if (text === "2" || text === "3") {
      return text === "3"
    }
    const setCookie = response.headers.getSetCookie()
    console.log({
      Cookie:
        "md_auto=qprint; " + setCookie.map((c) => c.split(";")[0]).join("; "),
      Host: "ege.fipi.ru",
      Origin: "https://ege.fipi.ru",
      Referer: `https://ege.fipi.ru/bank/questions.php?proj=${subjectId}&init_filter_themes=1`,
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
    })
    const authenticatedResponse = await fetchFipi("/bank/solve.php", {
      ...options,
      headers: {
        Cookie:
          "md_auto=qprint; " + setCookie.map((c) => c.split(";")[0]).join("; "),
        Host: "ege.fipi.ru",
        Origin: "https://ege.fipi.ru",
        Referer: `https://ege.fipi.ru/bank/questions.php?proj=${subjectId}&init_filter_themes=1`,
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
      },
    })
    const authenticatedText = await authenticatedResponse.text()
    console.log(authenticatedText)
    return authenticatedText === "3"
  } catch (e) {
    console.error(e)
    return undefined
  }
}

export const FIPI_SHOW_PICTURE_Q_REGEX = /ShowPictureQ\(['"]([^'"]*?)['"].*\)/g
export const FIPI_ID_REGEX = /^\s*\d+(\.\d+)*\s*/
