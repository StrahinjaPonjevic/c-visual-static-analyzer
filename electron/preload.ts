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
    }
})