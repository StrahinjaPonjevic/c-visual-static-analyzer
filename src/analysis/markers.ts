import type { CodeMarker, CppcheckIssue } from '@/types'

interface GccError {
  line: number
  column: number
  type: 'error' | 'warning'
  message: string
}

function mapCppcheckSeverity(severity: CppcheckIssue['severity']): CodeMarker['severity'] {
  switch (severity) {
    case 'error': return 'error'
    case 'warning': return 'warning'
    case 'style': return 'info'
    case 'performance': return 'warning'
    case 'portability': return 'info'
    case 'information': return 'info'
  }
}

function computeMetricMarkers(code: string): CodeMarker[] {
  const markers: CodeMarker[] = []
  const lines = code.split('\n')

  const hasMalloc = code.includes('malloc')
  const hasFree = code.includes('free')

  if (hasMalloc && !hasFree) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('malloc')) {
        markers.push({
          line: i + 1,
          severity: 'warning',
          message: 'malloc() bez odgovarajućeg free() – potencijalno curenje memorije',
          source: 'metric',
        })
      }
    }
  }

  if (hasFree && !hasMalloc) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('free')) {
        markers.push({
          line: i + 1,
          severity: 'warning',
          message: 'free() bez prethodnog malloc() – moguća greška',
          source: 'metric',
        })
      }
    }
  }

  return markers
}

export function computeMarkers(
  code: string,
  cppcheckIssues: CppcheckIssue[],
  gccErrors: GccError[],
): CodeMarker[] {
  const markers: CodeMarker[] = []

  for (const issue of cppcheckIssues) {
    if (issue.line <= 0) continue
    markers.push({
      line: issue.line,
      column: issue.column > 0 ? issue.column : undefined,
      severity: mapCppcheckSeverity(issue.severity),
      message: issue.message,
      source: 'cppcheck',
    })
  }

  for (const err of gccErrors) {
    if (err.line <= 0) continue
    markers.push({
      line: err.line,
      column: err.column > 0 ? err.column : undefined,
      severity: err.type === 'error' ? 'error' : 'warning',
      message: err.message,
      source: 'gcc',
    })
  }

  markers.push(...computeMetricMarkers(code))

  return markers
}
