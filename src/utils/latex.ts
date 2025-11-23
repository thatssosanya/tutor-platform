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

  let latexBuffer: string[] = []
  let inLatexBlock = false

  const countDollars = (str: string) => str.split("$").length - 1

  for (const line of lines) {
    const trimmed = line.trim()
    const dollarCount = countDollars(line)

    if (inLatexBlock) {
      latexBuffer.push(trimmed)

      if (dollarCount > 0 && dollarCount % 2 !== 0) {
        output.push(latexBuffer.join(""))

        latexBuffer = []
        inLatexBlock = false
      }
    } else {
      if (dollarCount === 1) {
        inLatexBlock = true
        latexBuffer.push(trimmed)
      } else {
        output.push(line)
      }
    }
  }

  if (inLatexBlock && latexBuffer.length > 0) {
    output.push(latexBuffer.join(""))
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
