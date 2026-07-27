import { contextBridge, ipcRenderer } from "electron"
import type { GccResult } from '../src/types'

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
    onFileExternallyChanged: (callback: (data: { filePath: string; content: string }) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, data: { filePath: string; content: string }) => callback(data)
        ipcRenderer.on('file:externally-changed', handler)
        return () => ipcRenderer.removeListener('file:externally-changed', handler)
    },
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
    checkCppcheck: () => ipcRenderer.invoke('cppcheck:check') as Promise<{ detected: boolean; version?: string }>,
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

    // Ollama LLM (streaming)
    sendChatMessage: (messages: { role: string; content: string }[]) =>
        ipcRenderer.send('llm:chat', messages),
    stopGeneration: () => ipcRenderer.send('llm:stop'),
    checkLlm: () => ipcRenderer.invoke('llm:check') as Promise<{ connected: boolean }>,
    onLlmChunk: (callback: (data: { content: string; role: string }) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, data: { content: string; role: string }) => callback(data)
        ipcRenderer.on('llm:chunk', handler)
        return () => ipcRenderer.removeListener('llm:chunk', handler)
    },
    onLlmDone: (callback: () => void) => {
        const handler = () => callback()
        ipcRenderer.on('llm:done', handler)
        return () => ipcRenderer.removeListener('llm:done', handler)
    },
    onLlmError: (callback: (error: string) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, error: string) => callback(error)
        ipcRenderer.on('llm:error', handler)
        return () => ipcRenderer.removeListener('llm:error', handler)
    },

    // Settings
    getSettings: () => ipcRenderer.invoke('settings:get'),
    saveSettings: (settings: unknown) => ipcRenderer.invoke('settings:save', settings),
})
