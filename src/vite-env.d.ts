/// <reference types="vite/client" />
interface Window {
    api: {
        openFile: () => Promise<{ filePath: string; content: string } | null>
        saveFile: (path: string, content: string) => Promise<boolean>
        onMenuOpen: (callback: () => void) => () => void
        onMenuSave: (callback: () => void) => () => void
        saveAsFile: (content: string) => Promise<string | null>
        minimizeWindow: () => void
        maximizeWindow: () => void
        closeWindow: () => void
        onWindowStateChanged: (callback: (maximized: boolean) => void) => () => void
    }
}
