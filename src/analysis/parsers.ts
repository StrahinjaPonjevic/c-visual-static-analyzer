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
  return preamble + before + '\n' + '  setvbuf(stdout, NULL, _IONBF, 0);\n  setvbuf(stderr, NULL, _IONBF, 0);\n' + after
}
