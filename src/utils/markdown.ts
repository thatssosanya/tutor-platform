const isTableRow = (line: string) => line.trim().startsWith("|")

const isJunkRow = (line: string) => /^[\|\s-]+$/.test(line)

const countColumns = (line: string) => {
  const content = line.trim().replace(/^\||\|$/g, "")
  return content.split("|").length
}

export function removeNonSemanticTables(input?: string | null) {
  if (!input) return input

  const lines = input.split("\n")
  const output: string[] = []
  let buffer: string[] = []

  const flushBuffer = () => {
    if (buffer.length === 0) return

    let maxCols = 0
    for (const row of buffer) {
      maxCols = Math.max(maxCols, countColumns(row))
    }

    const headerRow = `|${" |".repeat(maxCols)}`
    const separatorRow = `|${"---|".repeat(maxCols)}`

    output.push("\n")
    output.push(headerRow)
    output.push(separatorRow)
    output.push(...buffer)

    buffer = []
  }

  for (const line of lines) {
    if (isTableRow(line)) {
      if (isJunkRow(line)) {
        flushBuffer()
      } else {
        buffer.push(line.trim())
      }
    } else {
      flushBuffer()
      output.push(line)
    }
  }

  flushBuffer()

  return output
    .join("\n")
    .replaceAll(/(?:\n\s*){3,}/g, "\n\n")
    .trim()
}

export function disableOrderedLists(input: string) {
  const output = input.replaceAll(/((?:^|\n)\d+?)(?=[\.\)])/g, (m) => m + "\\")
  return output
}

export function insertNewlines(input: string) {
  const output = input.replaceAll(/(?<![\|\n])(?:\n)(?![\|\n])/g, "\n\n")
  return output
}

export function fixMarkdown(input?: string | null) {
  if (!input) {
    return input
  }
  return [disableOrderedLists, insertNewlines].reduce(
    (acc, fn) => fn(acc),
    input
  )
}
