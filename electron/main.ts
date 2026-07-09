import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

ipcMain.handle('file:open', async () => {
  const result = await dialog.showOpenDialog({
    filters: [{ name: 'C fajlovi', extensions: ['c', 'h'] }],
  })

  if (result.canceled) return null
  const filePath = result.filePaths[0]
  const content = await fs.readFile(filePath, 'utf-8')

  return { filePath, content }
})

ipcMain.handle('file:save', async (_event, filePath: string, content: string) => {
  await fs.writeFile(filePath, content, 'utf-8')
  return true
})

function buildMenu(win: BrowserWindow) {
  const template: any[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open C File...',
          accelerator: 'CmdOrCtrl+O',
          click: () => win.webContents.send('menu:open-file'),
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
          role: 'quit',
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Toggle DevTools', role: 'toggleDevTools' },
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload' },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function createWindow() {
  const iconName = process.platform === 'win32' ? 'logo.ico' : 'logo.png'

  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, iconName),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  buildMenu(win)

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)
