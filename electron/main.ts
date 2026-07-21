import { app, BrowserWindow, ipcMain, dialog, Menu, MenuItemConstructorOptions } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const __dirname = path.dirname(fileURLToPath(import.meta.url))

interface CppcheckError {
  id: string
  severity: 'error' | 'warning' | 'style' | 'performance' | 'information' | 'portability'
  message: string
  line: number
  column: number
  cwe?: number
}

interface CppcheckResult {
  issues: CppcheckError[]
  success: boolean
  error?: string
}

function parseCppcheckXml(xml: string): CppcheckError[] {
  const issues: CppcheckError[] = []

  const errorRegex = /<error\s+id="([^"]*)"\s+severity="([^"]*)"\s+msg="([^"]*)"(?:[^>]*)>([\s\S]*?)<\/error>/g
  let match: RegExpExecArray | null

  while ((match = errorRegex.exec(xml)) !== null) {
    const id = match[1]
    const severity = match[2] as CppcheckError['severity']
    const message = match[3]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')

    if (id === 'missingIncludeSystem' || id === 'checkersReport') continue

    const innerContent = match[4]
    const locationMatch = innerContent.match(/<location\s+file="([^"]*)"\s+line="(\d+)"(?:\s+column="(\d+)")?/)
    if (locationMatch) {
      const line = parseInt(locationMatch[2], 10) || 0
      const column = parseInt(locationMatch[3] || '0', 10) || 0
      const cweMatch = match[0].match(/cwe="(\d+)"/)
      issues.push({
        id,
        severity,
        message,
        line,
        column,
        cwe: cweMatch ? parseInt(cweMatch[1], 10) : undefined,
      })
    }
  }

  return issues
}

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

ipcMain.handle('file:save-as', async (_event, content: string) => {
  const result = await dialog.showSaveDialog({
    filters: [{ name: 'C fajlovi', extensions: ['c', 'h'] }],
  })
  if (result.canceled) return null
  await fs.writeFile(result.filePath, content, 'utf-8')
  return result.filePath
})

ipcMain.handle('cppcheck:analyze', async (_event, code: string): Promise<CppcheckResult> => {
  let tempFile: string | null = null
  try {
    const tempDir = os.tmpdir()
    tempFile = path.join(tempDir, `cppcheck_${Date.now()}.c`)
    await fs.writeFile(tempFile, code, 'utf-8')

    const cppcheckExe = process.platform === 'win32' ? 'cppcheck.exe' : 'cppcheck'

    let stdout: string
    let stderr: string
    try {
      const result = await execFileAsync(cppcheckExe, [
        '--enable=all',
        '--inline-suppr',
        '--std=c11',
        '--xml-version=2',
        '-q',
        tempFile,
      ], {
        maxBuffer: 10 * 1024 * 1024,
        timeout: 30000,
      })
      stdout = result.stdout || ''
      stderr = result.stderr || ''
    } catch (err) {
      const execErr = err as { stdout?: string; stderr?: string; message: string; code?: string }
      stdout = execErr.stdout || ''
      stderr = execErr.stderr || ''
      if (execErr.code === 'ENOENT') {
        return { issues: [], success: false, error: 'Cppcheck nije instaliran. Preuzmite ga na https://cppcheck.sourceforge.io/' }
      }
      if (!stdout && !stderr && execErr.message) {
        return { issues: [], success: false, error: execErr.message }
      }
    }

    const xmlOutput = stderr || stdout
    const issues = parseCppcheckXml(xmlOutput)

    return { issues, success: true }
  } catch (err) {
    return {
      issues: [],
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  } finally {
    if (tempFile) {
      try {
        await fs.unlink(tempFile)
      } catch {
        // ignore
      }
    }
  }
})

// ---- GCC compilation ----

interface GccError {
  line: number
  column: number
  type: 'error' | 'warning'
  message: string
}

const gccErrorRegex = /^([^:]+):(\d+):(\d+):\s+(error|warning):\s+(.+)$/gm

function parseGccErrors(stderr: string): GccError[] {
  const errors: GccError[] = []
  let match: RegExpExecArray | null
  while ((match = gccErrorRegex.exec(stderr)) !== null) {
    errors.push({
      line: parseInt(match[2], 10),
      column: parseInt(match[3], 10),
      type: match[4] as 'error' | 'warning',
      message: match[5],
    })
  }
  return errors
}

function injectUnbuffer(code: string): string {
  const hasStdioH = /#include\s*<stdio\.h>/.test(code)
  const preamble = hasStdioH ? '' : '#include <stdio.h>\n'

  const mainRegex = /(int\s+)?main\s*\([\s\S]*?\)\s*\{/
  const match = code.match(mainRegex)
  if (!match) return preamble + code

  const braceIndex = match.index! + match[0].length
  const before = code.slice(0, braceIndex)
  const after = code.slice(braceIndex)
  return preamble + before + '\n  setvbuf(stdout, NULL, _IONBF, 0);\n  setvbuf(stderr, NULL, _IONBF, 0);\n' + after
}

ipcMain.handle('gcc:compile', async (_event, code: string) => {
  const tempDir = os.tmpdir()
  const timestamp = Date.now()
  const cFilePath = path.join(tempDir, `gcc_${timestamp}.c`)
  const exePath = path.join(tempDir, process.platform === 'win32' ? `gcc_${timestamp}.exe` : `gcc_${timestamp}`)

  try {
    const injectedCode = injectUnbuffer(code)
    await fs.writeFile(cFilePath, injectedCode, 'utf-8')

    const gccExe = process.platform === 'win32' ? 'gcc.exe' : 'gcc'

    try {
      const result = await execFileAsync(gccExe, [
        '-std=c11', '-Wall', '-Wextra',
        '-o', exePath,
        cFilePath,
      ], {
        maxBuffer: 10 * 1024 * 1024,
        timeout: 30000,
      })

      return {
        success: true,
        exePath,
        errors: [] as GccError[],
        stdout: result.stdout || '',
        stderr: result.stderr || '',
      }
    } catch (err) {
      const execErr = err as { stdout?: string; stderr?: string; message: string; code?: string }

      if (execErr.code === 'ENOENT') {
        return {
          success: false,
          error: 'GCC nije instaliran. Instalirajte MinGW-GCC (Windows) ili gcc (Linux).',
          errors: [] as GccError[],
          stdout: '', stderr: '',
        }
      }

      const stderr = execErr.stderr || ''
      const stdout = execErr.stdout || ''
      const errors = parseGccErrors(stderr)

      return {
        success: errors.filter(e => e.type === 'error').length === 0,
        errors,
        stdout,
        stderr,
        exePath: errors.filter(e => e.type === 'error').length === 0 ? exePath : undefined,
      }
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      errors: [],
      stdout: '', stderr: '',
    }
  } finally {
    try { await fs.unlink(cFilePath) } catch { /* ignore */ }
  }
})

// ---- Program run (interactive via pipe) ----

let runningProcess: import('node:child_process').ChildProcess | null = null

ipcMain.handle('program:run', async (_event, exePath: string) => {
  if (runningProcess) {
    return { success: false, error: 'Program je već pokrenut' }
  }

  try {
    await fs.access(exePath, fs.constants.X_OK)
  } catch {
    try {
      await fs.access(exePath, fs.constants.R_OK)
    } catch {
      return { success: false, error: 'Izvršni fajl nije pronađen' }
    }
  }

  runningProcess = spawn(exePath, [], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: os.tmpdir(),
  })

  runningProcess.on('error', (err) => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win && !win.isDestroyed()) {
      win.webContents.send('program:error', err.message)
    }
    runningProcess = null
  })

  runningProcess.stdout?.on('data', (chunk: Buffer) => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win && !win.isDestroyed()) {
      win.webContents.send('program:stdout', chunk.toString())
    }
  })

  runningProcess.stderr?.on('data', (chunk: Buffer) => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win && !win.isDestroyed()) {
      win.webContents.send('program:stderr', chunk.toString())
    }
  })

  runningProcess.on('close', (code) => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win && !win.isDestroyed()) {
      win.webContents.send('program:exit', code)
    }
    runningProcess = null
  })

  return { success: true }
})

ipcMain.handle('program:stdin', (_event, data: string) => {
  if (!runningProcess || !runningProcess.stdin) {
    return { success: false, error: 'Program nije pokrenut' }
  }
  runningProcess.stdin.write(data)
  return { success: true }
})

ipcMain.handle('program:kill', async () => {
  if (!runningProcess) {
    return { success: false, error: 'Nema aktivnog procesa' }
  }
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(runningProcess.pid), '/f', '/t'])
  } else {
    runningProcess.kill('SIGTERM')
  }
  runningProcess = null
  return { success: true }
})

// Clean up running process on app quit
app.on('before-quit', () => {
  if (runningProcess) {
    if (process.platform === 'win32' && runningProcess.pid) {
      spawn('taskkill', ['/pid', String(runningProcess.pid), '/f', '/t'])
    } else {
      runningProcess.kill('SIGTERM')
    }
    runningProcess = null
  }
})

ipcMain.on('window:minimize', () => {
  win?.minimize()
})

ipcMain.on('window:maximize', () => {
  if (win?.isMaximized()) {
    win.unmaximize()
  } else {
    win?.maximize()
  }
})

ipcMain.on('window:close', () => {
  win?.close()
})

ipcMain.on('app:force-close', () => {
  win?.destroy()
})

function buildMenu(win: BrowserWindow) {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open C File...',
          accelerator: 'CmdOrCtrl+O',
          click: () => win.webContents.send('menu:open-file'),
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => win.webContents.send('menu:save-file'),
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
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  buildMenu(win)

  win.on('close', (e) => {
    e.preventDefault()
    win?.webContents.send('app:confirm-close')
  })

  win.on('maximize', () => {
    win?.webContents.send('window-state-changed', true)
  })

  win.on('unmaximize', () => {
    win?.webContents.send('window-state-changed', false)
  })

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
