import { Agent, fetch } from "undici"
import { env } from "@/env"
import tls from "node:tls"

const FIPI_BASE_URL = "https://ege.fipi.ru"

export const fetchFipi = async (path: string) => {
  const fipiAgent = new Agent({
    connect: {
      ca: [...tls.rootCertificates, env.FIPI_INTERMEDIATE_CERT],
    },
  })

  const response = await fetch(`${FIPI_BASE_URL}${path}`, {
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
    },
    method: "GET",
    dispatcher: fipiAgent,
  })

  if (!response.ok) throw new Error("Failed to fetch " + path)

  const buffer = await response.arrayBuffer()
  const decoder = new TextDecoder("windows-1251")
  const html = decoder.decode(buffer)

  return html
}

export const FIPI_SHOW_PICTURE_Q_REGEX = /ShowPictureQ\('(.*?)'\)/g
export const FIPI_ID_CLEANUP_REGEX = /^\s*\d+(\.\d+)*\s*/
export const FIPI_URL = FIPI_BASE_URL
