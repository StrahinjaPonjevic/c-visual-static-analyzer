export interface CodeMarker {
  line: number
  column?: number
  severity: 'error' | 'warning' | 'info' | 'good'
  message: string
  source: 'cppcheck' | 'gcc' | 'metric'
}

export interface CppcheckIssue {
  id: string
  severity: 'error' | 'warning' | 'style' | 'performance' | 'information' | 'portability'
  message: string
  line: number
  column: number
  cwe?: number
}
