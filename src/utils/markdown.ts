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
