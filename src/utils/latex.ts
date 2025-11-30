import { MathMLToLaTeX } from "mathml-to-latex"

// matches leftXright. or left.rightX and captures X
// the actual side command is unreliable so it's not captured
export const sidedDelimiterRegex =
  /\s*(?:\\left([\(\)\[\]\{\}])\\right\.|\\left\.\\right([\(\[\{\)\]\}]))\s*/g
export const openingDelimiters = "([{"
export function fixSidedDelimiters(input: string) {
  const output = input.replaceAll(sidedDelimiterRegex, (_, g1, g2) => {
    const delimiter = g1 || g2
    if (openingDelimiters.includes(delimiter)) {
      return "\\left" + delimiter
    } else {
      return "\\right" + delimiter
    }
  })
  return output
}

// pipes are always left|right.
// handle left.right| just in case
export const pipeRegex = /\s*(?:\\left\|\\right\.|\\left\.\\right\.)\s*/g
export function fixPipeDelimiters(input: string) {
  const output = input.replaceAll(pipeRegex, "|")
  return output
}

// cases is malformed as a hanging opening brace
function fixCases(input: string): string {
  const stack: number[] = [] // storing i for opening \left{

  for (let i = 0; i < input.length; i++) {
    if (input.substring(i, i + 6) === "\\left{") {
      stack.push(i)
      i += 5
    } else if (input.substring(i, i + 7) === "\\right}") {
      if (stack.length > 0) {
        stack.pop()
      }
      i += 6
    }
  }

  if (stack.length === 0) {
    return input
  }

  let processedLatex = input
  const unclosedBraces = stack.length

  while (stack.length > 0) {
    const indexToReplace = stack.pop()!

    processedLatex =
      processedLatex.substring(0, indexToReplace) +
      "\\begin{cases}" +
      processedLatex.substring(indexToReplace + 6)
  }
  for (let i = 0; i < unclosedBraces; i++) {
    processedLatex += "\\end{cases}"
  }

  return processedLatex
}

// prefer dfrac
export function fixFrac(input: string): string {
  const output = input.replaceAll("\\frac", "\\dfrac")
  return output
}

export function fixEmptySubsAndSupers(input: string): string {
  const output = input.replaceAll(/[\_\^]\{\}/g, "")
  return output
}

export function fixHangingDollarSignDelimiters(input: string | null) {
  if (!input) {
    return input
  }
  const lines = input.split("\n")
  const output: string[] = []

  const endsWithOpRegex = /([=\+\-\*\/ \^ \(\[\{,]|\\[a-zA-Z]+)\s*$/

  const startsWithOpRegex = /^\s*([=\+\-\*\/ \^ \)\,\].\}])/

  for (let i = 0; i < lines.length; i++) {
    let currentLine = lines[i] ?? ""

    const countDollars = (str: string) => (str.match(/\$/g) || []).length
    let dollarCount = countDollars(currentLine)

    if (dollarCount % 2 !== 0 && i < lines.length - 1) {
      const nextLine = lines[i + 1] ?? ""

      const endsWithOp = endsWithOpRegex.test(currentLine)
      const startsWithOp = startsWithOpRegex.test(nextLine)

      if (endsWithOp || startsWithOp) {
        currentLine = currentLine.trimEnd() + " " + nextLine.trimStart()
        i++
        dollarCount = countDollars(currentLine)
      }
    }

    if (dollarCount % 2 !== 0) {
      const trimmed = currentLine.trim()

      if (trimmed.startsWith("$")) {
        currentLine += "$"
      } else if (trimmed.endsWith("$")) {
        currentLine = "$" + currentLine
      }
    }

    output.push(currentLine)
  }

  return output.join("\n")
}

export function fixMalformedLatex(input?: string | null) {
  if (!input) {
    return input
  }
  return [
    fixFrac,
    fixSidedDelimiters,
    fixPipeDelimiters,
    fixCases,
    fixEmptySubsAndSupers,
  ].reduce((acc, fn) => fn(acc), input)
}

export function convertMathmlToLatex(input: string) {
  const malformedLatex = MathMLToLaTeX.convert(input)
  const correctedLatex = fixMalformedLatex(malformedLatex)
  return correctedLatex
}
