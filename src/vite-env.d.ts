/// <reference types="vite/client" />
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
    }
}
