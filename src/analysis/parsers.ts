import type { CppcheckIssue, GccError } from '../types'
import { stripCommentsAndStrings } from '../lib/utils'

export { stripCommentsAndStrings }

export function parseCppcheckXml(xml: string): CppcheckIssue[] {
  const issues: CppcheckIssue[] = []

  const errorBlockRegex = /<error\s+([^>]*?)>([\s\S]*?)<\/error>/g
  let match: RegExpExecArray | null

  while ((match = errorBlockRegex.exec(xml)) !== null) {
    const attrString = match[1]
    const innerContent = match[2]

    const idMatch = attrString.match(/\bid="([^"]*)"/)
    const severityMatch = attrString.match(/\bseverity="([^"]*)"/)
    const msgMatch = attrString.match(/\bmsg="([^"]*)"/)
    const cweMatch = attrString.match(/\bcwe="(\d+)"/)

    if (!idMatch || !severityMatch || !msgMatch) continue

    const id = idMatch[1]
    const severity = severityMatch[1] as CppcheckIssue['severity']
    const rawMsg = msgMatch[1]
    const message = rawMsg
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')

    if (id === 'missingIncludeSystem' || id === 'checkersReport') continue

    const locationMatch = innerContent.match(/<location\s+file="([^"]*)"\s+line="(\d+)"(?:\s+column="(\d+)")?/)
    if (locationMatch) {
      const filePath = locationMatch[1]
      const line = parseInt(locationMatch[2], 10) || 0
      const column = parseInt(locationMatch[3] || '0', 10) || 0
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

const gccErrorRegex = /^((?:[a-zA-Z]:)?[^:]+):(\d+):(?:(\d+):)?\s+(error|warning|fatal error):\s+(.+)$/gm

export function parseGccErrors(stderr: string): GccError[] {
  const errors: GccError[] = []
  let match: RegExpExecArray | null
  while ((match = gccErrorRegex.exec(stderr)) !== null) {
    const rawType = match[4]
    errors.push({
      filePath: match[1],
      line: parseInt(match[2], 10),
      column: match[3] ? parseInt(match[3], 10) : 0,
      type: rawType.includes('error') ? 'error' : 'warning',
      message: match[5],
    })
  }
  return errors
}

export function stripCommentsPreserveIndices(code: string): string {
  let result = ''
  let i = 0
  while (i < code.length) {
    if (code[i] === '/' && code[i + 1] === '/') {
      result += '  '
      i += 2
      while (i < code.length && code[i] !== '\n') {
        result += ' '
        i++
      }
    } else if (code[i] === '/' && code[i + 1] === '*') {
      result += '  '
      i += 2
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) {
        result += code[i] === '\n' ? '\n' : ' '
        i++
      }
      if (i < code.length) {
        result += '  '
        i += 2
      }
    } else if (code[i] === '"') {
      result += '"'
      i++
      while (i < code.length && code[i] !== '"') {
        if (code[i] === '\\' && i + 1 < code.length) {
          result += '  '
          i += 2
          continue
        }
        result += code[i] === '\n' ? '\n' : ' '
        i++
      }
      if (i < code.length) {
        result += '"'
        i++
      }
    } else if (code[i] === "'") {
      result += "'"
      i++
      while (i < code.length && code[i] !== "'") {
        if (code[i] === '\\' && i + 1 < code.length) {
          result += '  '
          i += 2
          continue
        }
        result += code[i] === '\n' ? '\n' : ' '
        i++
      }
      if (i < code.length) {
        result += "'"
        i++
      }
    } else {
      result += code[i]
      i++
    }
  }
  return result
}

export function injectUnbuffer(code: string): string {
  const hasStdioH = /#include\s*<stdio\.h>/.test(code)
  const preamble = hasStdioH ? '' : '#include <stdio.h>\n'

  const stripped = stripCommentsPreserveIndices(code)
  const mainRegex = /\b(?:int|void)\s+main\s*\([\s\S]*?\)\s*\{/
  const match = stripped.match(mainRegex)
  if (!match || match.index === undefined) return preamble + code

  const braceIndex = match.index + match[0].length
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
  cyclomaticComplexity: number
  memoryLeakRisk: boolean
}

const FUNCTION_DEF_REGEX = /\b(?:(?:static|inline|extern|const|volatile)\s+)*(?:void|int|char|float|double|long|short|unsigned|signed|bool|size_t|ssize_t|int8_t|int16_t|int32_t|int64_t|uint8_t|uint16_t|uint32_t|uint64_t|uintptr_t|intptr_t|FILE|struct\s+\w+|union\s+\w+|enum\s+\w+|[a-zA-Z_]\w*_t|[A-Z]\w*)(?:\s*\*+|\s+)\s*\*?\s*([a-zA-Z_]\w*)\s*\([^)]*\)\s*\{/g

export function computeMetrics(rawCode: string): CodeMetrics {
  const code = stripCommentsAndStrings(rawCode)
  const lines = rawCode.split("\n")
  const totalLines = lines.length
  const nonEmptyLines = lines.filter((l) => l.trim().length > 0).length

  let functionCount = 0
  let funcMatch: RegExpExecArray | null
  const funcRegex = new RegExp(FUNCTION_DEF_REGEX)
  while ((funcMatch = funcRegex.exec(code)) !== null) {
    const name = funcMatch[1]
    if (name === 'if' || name === 'while' || name === 'for' || name === 'switch') continue
    functionCount++
  }

  const elseIfCount = (code.match(/\belse\s+if\s*\(/g) || []).length
  const ifCount = (code.match(/\bif\s*\(/g) || []).length - elseIfCount

  const forCount = (code.match(/\bfor\s*\(/g) || []).length
  const whileCount = (code.match(/\bwhile\s*\(/g) || []).length
  const doCount = (code.match(/\bdo\s*\{/g) || []).length
  const loops = forCount + whileCount + doCount

  const pointerMatches = code.match(/\b\w+\s*\*+\s*\w+(\s*=|\s*;|\s*,|\s*\))/g) || []
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

  const ternaryCount = (code.match(/\?/g) || []).length
  const caseCount = (code.match(/\bcase\s+/g) || []).length
  const logicalAndCount = (code.match(/&&/g) || []).length
  const logicalOrCount = (code.match(/\|\|/g) || []).length

  const cyclomaticComplexity = 1 + ifCount + elseIfCount + loops + caseCount + ternaryCount + logicalAndCount + logicalOrCount
  const memoryLeakRisk = mallocCalls > freeCalls

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
    cyclomaticComplexity,
    memoryLeakRisk,
  }
}

export interface FunctionCallNode {
  name: string
  line: number
  calls: string[]
}

export function extractCallGraph(rawCode: string): FunctionCallNode[] {
  const code = stripCommentsAndStrings(rawCode)
  const nodes: FunctionCallNode[] = []

  const funcDefRegex = new RegExp(FUNCTION_DEF_REGEX)
  let match: RegExpExecArray | null

  const definedFunctions: { name: string; startLine: number; startIndex: number }[] = []
  while ((match = funcDefRegex.exec(code)) !== null) {
    const funcName = match[1]
    if (funcName === 'if' || funcName === 'while' || funcName === 'for' || funcName === 'switch') continue
    const startIndex = match.index
    const startLine = code.slice(0, startIndex).split('\n').length
    definedFunctions.push({ name: funcName, startLine, startIndex })
  }

  for (let i = 0; i < definedFunctions.length; i++) {
    const current = definedFunctions[i]
    const nextStart = i + 1 < definedFunctions.length ? definedFunctions[i + 1].startIndex : code.length
    const body = code.slice(current.startIndex, nextStart)

    const calls = new Set<string>()
    for (const other of definedFunctions) {
      if (other.name === current.name) continue
      const callRegex = new RegExp(`\\b${other.name}\\s*\\(`, 'g')
      if (callRegex.test(body)) {
        calls.add(other.name)
      }
    }

    nodes.push({
      name: current.name,
      line: current.startLine,
      calls: Array.from(calls),
    })
  }

  return nodes
}

