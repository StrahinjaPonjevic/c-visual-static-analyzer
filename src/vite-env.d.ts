/// <reference types="vite/client" />

interface Window {
    api: {
        openFile: () => Promise<{ filePath: string; content: string } | null>
        readFile: (filePath: string) => Promise<{ filePath: string; content: string } | null>
        saveFile: (path: string, content: string) => Promise<{ success: boolean; error?: string }>
        openFolder: () => Promise<{ folderPath: string; folderName: string; tree: import('./types/project').FileNode[] } | null>
        readProjectTree: (folderPath: string) => Promise<import('./types/project').FileNode[]>
        createProjectFile: (targetPath: string) => Promise<{ success: boolean; error?: string }>
        createProjectFolder: (targetPath: string) => Promise<{ success: boolean; error?: string }>
        renameProjectItem: (oldPath: string, newPath: string) => Promise<{ success: boolean; error?: string }>
        deleteProjectItem: (targetPath: string) => Promise<{ success: boolean; error?: string }>
        compileProject: (projectDir: string) => Promise<import('./types').GccResult>
        analyzeProject: (projectDir: string) => Promise<{ issues: import('./types').CppcheckIssue[]; success: boolean; error?: string }>
        onMenuOpen: (callback: () => void) => () => void
        onMenuOpenFolder: (callback: () => void) => () => void
        onMenuCloseFolder: (callback: () => void) => () => void
        onMenuSave: (callback: () => void) => () => void
        onFileExternallyChanged: (callback: (data: { filePath: string; content: string }) => void) => () => void
        saveAsFile: (content: string, defaultPath?: string) => Promise<string | null>
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

        // GCC check, compile & run
        checkGcc: () => Promise<{ detected: boolean; version?: string }>
        checkCppcheck: () => Promise<{ detected: boolean; version?: string }>
        compileCode: (code: string) => Promise<import('./types').GccResult>
        runProgram: (exePath: string) => Promise<{ success: boolean; error?: string }>
        sendStdin: (data: string) => Promise<{ success: boolean; error?: string }>
        killProgram: () => Promise<{ success: boolean; error?: string }>
        onProgramStdout: (callback: (data: string) => void) => () => void
        onProgramStderr: (callback: (data: string) => void) => () => void
        onProgramExit: (callback: (code: number | null) => void) => () => void
        onProgramError: (callback: (error: string) => void) => () => void

        // Ollama LLM (streaming)
        sendChatMessage: (messages: { role: string; content: string }[]) => void
        stopGeneration: () => void
        checkLlm: () => Promise<{ connected: boolean }>
        onLlmChunk: (callback: (data: { content: string; role: string }) => void) => () => void
        onLlmDone: (callback: () => void) => () => void
        onLlmError: (callback: (error: string) => void) => () => void

        // Settings
        getSettings: () => Promise<import('./types/settings').AppSettings>
        saveSettings: (settings: import('./types/settings').AppSettings) => Promise<{ success: boolean; error?: string }>
    }
}
