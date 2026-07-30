import type { CppcheckIssue, GccError } from '@/types'

export function parseCppcheckXml(xml: string): CppcheckIssue[] {
  const issues: CppcheckIssue[] = []

  const errorRegex = /<error\s+id="([^"]*)"\s+severity="([^"]*)"\s+msg="([^"]*)"(?:[^>]*)>([\s\S]*?)<\/error>/g
  let match: RegExpExecArray | null

  while ((match = errorRegex.exec(xml)) !== null) {
    const id = match[1]
    const severity = match[2] as CppcheckIssue['severity']
    const message = match[3]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')

    if (id === 'missingIncludeSystem' || id === 'checkersReport') continue

    const innerContent = match[4]
    const locationMatch = innerContent.match(/<location\s+file="([^"]*)"\s+line="(\d+)"(?:\s+column="(\d+)")?/)
    if (locationMatch) {
      const filePath = locationMatch[1]
      const line = parseInt(locationMatch[2], 10) || 0
      const column = parseInt(locationMatch[3] || '0', 10) || 0
      const cweMatch = match[0].match(/cwe="(\d+)"/)
      issues.push({
        id,
        severity,
        message,
        line,
        column,
        cwe: cweMatch ? parseInt(cweMatch[1], 10) : undefined,
        filePath,
      })
    }
  }

  return issues
}

const gccErrorRegex = /^((?:[a-zA-Z]:)?[^:]+):(\d+):(\d+):\s+(error|warning):\s+(.+)$/gm

export function parseGccErrors(stderr: string): GccError[] {
  const errors: GccError[] = []
  let match: RegExpExecArray | null
  while ((match = gccErrorRegex.exec(stderr)) !== null) {
    errors.push({
      filePath: match[1],
      line: parseInt(match[2], 10),
      column: parseInt(match[3], 10),
      type: match[4] as 'error' | 'warning',
      message: match[5],
    })
  }
  return errors
}

export function injectUnbuffer(code: string): string {
  const hasStdioH = /#include\s*<stdio\.h>/.test(code)
  const preamble = hasStdioH ? '' : '#include <stdio.h>\n'

  const mainRegex = /(int\s+)?main\s*\([\s\S]*?\)\s*\{/
  const match = code.match(mainRegex)
  if (!match) return preamble + code

  const braceIndex = match.index! + match[0].length
  const before = code.slice(0, braceIndex)
  const after = code.slice(braceIndex)
  return preamble + before + ' setvbuf(stdout, NULL, _IONBF, 0); setvbuf(stderr, NULL, _IONBF, 0);' + after
}

export interface CodeMetrics {
  lines: number
  totalLines: number
  functions: number
  ifStatements: number
  loops: number
  arrays: number
  pointers: number
  structs: number
  mallocCalls: number
  freeCalls: number
  includes: number
  comments: number
}

export function stripCommentsAndStrings(code: string): string {
  let result = ''
  let i = 0
  while (i < code.length) {
    if (code[i] === '/' && code[i + 1] === '/') {
      while (i < code.length && code[i] !== '\n') i++
    } else if (code[i] === '/' && code[i + 1] === '*') {
      result += ' '
      i += 2
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) {
        if (code[i] === '\n') result += '\n'
        i++
      }
      if (i < code.length) i += 2
    } else if (code[i] === '"') {
      result += ' '
      i++
      while (i < code.length && code[i] !== '"') {
        if (code[i] === '\\') i++
        i++
      }
      i++
    } else if (code[i] === "'") {
      result += ' '
      i++
      while (i < code.length && code[i] !== "'") {
        if (code[i] === '\\') i++
        i++
      }
      i++
    } else {
      result += code[i]
      i++
    }
  }
  return result
}

export function computeMetrics(rawCode: string): CodeMetrics {
  const code = stripCommentsAndStrings(rawCode)
  const lines = rawCode.split("\n")
  const totalLines = lines.length
  const nonEmptyLines = lines.filter((l) => l.trim().length > 0).length

  const functionCount = (
    code.match(
      /\b(void|int|char|float|double|long|short|unsigned|signed|static|extern|const)\s+\*?\s*\w+\s*\([^)]*\)\s*\{/g
    ) || []
  ).length

  const elseIfCount = (code.match(/\belse\s+if\s*\(/g) || []).length
  const ifCount = (code.match(/\bif\s*\(/g) || []).length - elseIfCount

  const forCount = (code.match(/\bfor\s*\(/g) || []).length
  const whileCount = (code.match(/\bwhile\s*\(/g) || []).length
  const doCount = (code.match(/\bdo\s*\{/g) || []).length
  const loops = forCount + whileCount + doCount

  const pointerMatches = code.match(/\b\w+\s*\*\s*\w+(\s*=|\s*;|\s*,|\s*\))/g) || []
  const pointers = pointerMatches.length

  const arrayMatches = code.match(/\w+\s*\[\s*\d*\s*\]/g) || []
  const arrays = arrayMatches.length

  const structMatches = code.match(/\bstruct\s+\w+\s*\{/g) || []
  const structs = structMatches.length

  const mallocCalls = (code.match(/\bmalloc\s*\(/g) || []).length
  const freeCalls = (code.match(/\bfree\s*\(/g) || []).length

  const includes = (rawCode.match(/#include\s*[<"]/g) || []).length

  const singleLineComments = (rawCode.match(/\/\/.*$/gm) || []).length
  const multiLineComments = (rawCode.match(/\/\*[\s\S]*?\*\//g) || []).length
  const comments = singleLineComments + multiLineComments

  return {
    lines: nonEmptyLines,
    totalLines,
    functions: functionCount,
    ifStatements: ifCount + elseIfCount,
    loops,
    arrays,
    pointers,
    structs,
    mallocCalls,
    freeCalls,
    includes,
    comments,
  }
}

