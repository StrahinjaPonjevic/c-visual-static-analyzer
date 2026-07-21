import { contextBridge, ipcRenderer } from "electron"

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

contextBridge.exposeInMainWorld('api', {
    openFile: () => ipcRenderer.invoke('file:open'),
    saveFile: (path: string, content: string) =>
        ipcRenderer.invoke('file:save', path, content),
    onMenuOpen: (callback: () => void) => {
        const handler = () => callback()
        ipcRenderer.on('menu:open-file', handler)
        return () => ipcRenderer.removeListener('menu:open-file', handler)
    },
    onMenuSave: (callback: () => void) => {
        const handler = () => callback()
        ipcRenderer.on('menu:save-file', handler)
        return () => ipcRenderer.removeListener('menu:save-file', handler)
    },
    saveAsFile: (content: string) => ipcRenderer.invoke('file:save-as', content),
    analyzeCode: (code: string) => ipcRenderer.invoke('cppcheck:analyze', code),
    minimizeWindow: () => ipcRenderer.send('window:minimize'),
    maximizeWindow: () => ipcRenderer.send('window:maximize'),
    closeWindow: () => ipcRenderer.send('window:close'),
    forceClose: () => ipcRenderer.send('app:force-close'),
    onConfirmClose: (callback: () => void) => {
        const handler = () => callback()
        ipcRenderer.on('app:confirm-close', handler)
        return () => ipcRenderer.removeListener('app:confirm-close', handler)
    },
    onWindowStateChanged: (callback: (maximized: boolean) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, maximized: boolean) => callback(maximized)
        ipcRenderer.on('window-state-changed', handler)
        return () => ipcRenderer.removeListener('window-state-changed', handler)
    },

    // GCC check, compile & run
    checkGcc: () => ipcRenderer.invoke('gcc:check') as Promise<{ detected: boolean; version?: string }>,
    compileCode: (code: string) => ipcRenderer.invoke('gcc:compile', code) as Promise<GccResult>,
    runProgram: (exePath: string) => ipcRenderer.invoke('program:run', exePath) as Promise<{ success: boolean; error?: string }>,
    sendStdin: (data: string) => ipcRenderer.invoke('program:stdin', data) as Promise<{ success: boolean; error?: string }>,
    killProgram: () => ipcRenderer.invoke('program:kill') as Promise<{ success: boolean; error?: string }>,

    onProgramStdout: (callback: (data: string) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, data: string) => callback(data)
        ipcRenderer.on('program:stdout', handler)
        return () => ipcRenderer.removeListener('program:stdout', handler)
    },
    onProgramStderr: (callback: (data: string) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, data: string) => callback(data)
        ipcRenderer.on('program:stderr', handler)
        return () => ipcRenderer.removeListener('program:stderr', handler)
    },
    onProgramExit: (callback: (code: number | null) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, code: number | null) => callback(code)
        ipcRenderer.on('program:exit', handler)
        return () => ipcRenderer.removeListener('program:exit', handler)
    },
    onProgramError: (callback: (error: string) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, error: string) => callback(error)
        ipcRenderer.on('program:error', handler)
        return () => ipcRenderer.removeListener('program:error', handler)
    },
})
