import { useState, useEffect } from "react"
import { useRouter } from "next/router"

type UseQueryParamOptions = {
  isSyncEnabled?: boolean
}

export function useQueryParam(
  paramName: string,
  { isSyncEnabled = true }: UseQueryParamOptions = {}
): [
  value: string | null,
  setValue: React.Dispatch<React.SetStateAction<string | null>>,
] {
  const router = useRouter()

  const getQueryParamValue = () => {
    if (!router.isReady) {
      return null
    }
    const paramValue = router.query[paramName]
    return (Array.isArray(paramValue) ? paramValue[0] : paramValue) || null
  }

  const [value, setValue] = useState<string | null>(getQueryParamValue)

  useEffect(() => {
    if (!isSyncEnabled || !router.isReady) {
      return
    }

    const currentQuery = { ...router.query }
    const oldValue = currentQuery[paramName]

    if (oldValue === value || (!oldValue && !value)) {
      return
    }

    if (value === null || value === "") {
      delete currentQuery[paramName]
    } else {
      currentQuery[paramName] = value
    }

    router.replace(
      {
        pathname: router.pathname,
        query: currentQuery,
      },
      undefined,
      { shallow: true }
    )
  }, [value, paramName, router, isSyncEnabled])

  return [value, setValue]
}
