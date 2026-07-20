import { contextBridge, ipcRenderer } from "electron"

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
})
