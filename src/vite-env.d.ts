/// <reference types="vite/client" />

interface GccError {
  line: number
  column: number
  type: 'error' | 'warning'
  message: string
}

interface GccResult {
  success: boolean
  errors: GccError[]
  stdout: string
  stderr: string
  exePath?: string
  error?: string
}

interface Window {
    api: {
        openFile: () => Promise<{ filePath: string; content: string } | null>
        saveFile: (path: string, content: string) => Promise<boolean>
        onMenuOpen: (callback: () => void) => () => void
        onMenuSave: (callback: () => void) => () => void
        saveAsFile: (content: string) => Promise<string | null>
        analyzeCode: (code: string) => Promise<{
            issues: {
                id: string
                severity: 'error' | 'warning' | 'style' | 'performance' | 'information' | 'portability'
                message: string
                line: number
                column: number
                cwe?: number
            }[]
            success: boolean
            error?: string
        }>
        minimizeWindow: () => void
        maximizeWindow: () => void
        closeWindow: () => void
        forceClose: () => void
        onConfirmClose: (callback: () => void) => () => void
        onWindowStateChanged: (callback: (maximized: boolean) => void) => () => void

        // GCC compile & run
        compileCode: (code: string) => Promise<GccResult>
        runProgram: (exePath: string) => Promise<{ success: boolean; error?: string }>
        sendStdin: (data: string) => Promise<{ success: boolean; error?: string }>
        killProgram: () => Promise<{ success: boolean; error?: string }>
        onProgramStdout: (callback: (data: string) => void) => () => void
        onProgramStderr: (callback: (data: string) => void) => () => void
        onProgramExit: (callback: (code: number | null) => void) => () => void
        onProgramError: (callback: (error: string) => void) => () => void
    }
}
