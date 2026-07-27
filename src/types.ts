export interface CodeMarker {
  line: number
  column?: number
  severity: 'error' | 'warning' | 'info' | 'good'
  message: string
  source: 'cppcheck' | 'gcc' | 'metric'
}

export interface GccError {
  line: number
  column: number
  type: 'error' | 'warning'
  message: string
}

export interface GccResult {
  success: boolean
  errors: GccError[]
  stdout: string
  stderr: string
  exePath?: string
  error?: string
}

export interface CppcheckIssue {
  id: string
  severity: 'error' | 'warning' | 'style' | 'performance' | 'information' | 'portability'
  message: string
  line: number
  column: number
  cwe?: number
}
