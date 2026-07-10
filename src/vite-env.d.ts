/// <reference types="vite/client" />
interface Window {
    api: {
        openFile: () => Promise<{ filePath: string; content: string } | null>
        saveFile: (path: string, content: string) => Promise<boolean>
        onMenuOpen: (callback: () => void) => () => void
        onMenuSave: (callback: () => void) => () => void
    }
}