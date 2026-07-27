import { app, BrowserWindow, ipcMain, dialog, Menu, MenuItemConstructorOptions } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { loadSettings, saveSettings, DEFAULTS, type AppSettings } from './settings'
import type { GccError, CppcheckIssue } from '../src/types'
import { parseCppcheckXml, parseGccErrors, injectUnbuffer } from '../src/analysis/parsers'

const execFileAsync = promisify(execFile)

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason)
})

const __dirname = path.dirname(fileURLToPath(import.meta.url))

interface CppcheckResult {
  issues: CppcheckIssue[]
  success: boolean
  error?: string
}

process.env.APP_ROOT = path.join(__dirname, '..')

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let isClosing = false

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
  if (!filePath || typeof filePath !== 'string') {
    return { success: false, error: 'Invalid file path' }
  }
  if (typeof content !== 'string') {
    return { success: false, error: 'Invalid content' }
  }
  try {
    await fs.writeFile(filePath, content, 'utf-8')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
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
  if (typeof code !== 'string') {
    return { issues: [], success: false, error: 'Invalid input' }
  }
  if (code.length > 1024 * 1024) {
    return { issues: [], success: false, error: 'Code exceeds maximum size (1MB)' }
  }
  let tempFile: string | null = null
  try {
    const settings = await loadSettings().catch(() => null)
    const extraFlags = settings?.cppcheck.extraFlags
      ? settings.cppcheck.extraFlags.split(/\s+/).filter(Boolean)
      : []
    const cStandard = settings?.compiler.cStandard || 'c11'

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
        `--std=${cStandard}`,
        '--xml-version=2',
        '-q',
        ...extraFlags,
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

// ---- Cppcheck detection ----

ipcMain.handle('cppcheck:check', async (): Promise<{ detected: boolean; version?: string }> => {
  const cppcheckExe = process.platform === 'win32' ? 'cppcheck.exe' : 'cppcheck'
  try {
    const { stdout } = await execFileAsync(cppcheckExe, ['--version'], { timeout: 5000 })
    const firstLine = stdout.trim()
    const version = firstLine || undefined
    return { detected: true, version }
  } catch {
    return { detected: false }
  }
})

// ---- Settings ----

ipcMain.handle('settings:get', async (): Promise<AppSettings> => {
  return loadSettings()
})

ipcMain.handle('settings:save', async (_event, settings: AppSettings): Promise<{ success: boolean; error?: string }> => {
  try {
    await saveSettings(settings)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
})

// ---- GCC detection ----

ipcMain.handle('gcc:check', async (): Promise<{ detected: boolean; version?: string }> => {
  const gccExe = process.platform === 'win32' ? 'gcc.exe' : 'gcc'
  try {
    const { stdout } = await execFileAsync(gccExe, ['--version'], { timeout: 5000 })
    const firstLine = stdout.trim().split('\n')[0]
    const version = firstLine || undefined
    return { detected: true, version }
  } catch {
    return { detected: false }
  }
})

// ---- GCC compilation ----

ipcMain.handle('gcc:compile', async (_event, code: string) => {
  const tempDir = os.tmpdir()
  const timestamp = Date.now()
  const cFilePath = path.join(tempDir, `gcc_${timestamp}.c`)
  const exePath = path.join(tempDir, process.platform === 'win32' ? `gcc_${timestamp}.exe` : `gcc_${timestamp}`)

  let settings: AppSettings
  try {
    settings = await loadSettings()
  } catch {
    settings = { ...DEFAULTS }
  }

  const cStandard = settings.compiler.cStandard || 'c11'
  const extraFlags = settings.compiler.extraFlags
    ? settings.compiler.extraFlags.split(/\s+/).filter(Boolean)
    : []

  try {
    const injectedCode = injectUnbuffer(code)
    await fs.writeFile(cFilePath, injectedCode, 'utf-8')

    const gccExe = process.platform === 'win32' ? 'gcc.exe' : 'gcc'

    try {
      const result = await execFileAsync(gccExe, [
        `-std=${cStandard}`, '-Wall', '-Wextra',
        ...extraFlags,
        '-o', exePath,
        cFilePath,
      ], {
        maxBuffer: 10 * 1024 * 1024,
        timeout: 30000,
      })

      const stderr = result.stderr || ''
      const warnings = parseGccErrors(stderr)

      return {
        success: true,
        exePath,
        errors: warnings,
        stdout: result.stdout || '',
        stderr,
      }
    } catch (err) {
      const execErr = err as { stdout?: string; stderr?: string; message: string; code?: string | number }

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

      // Ako nijedna linija nije parsirana, ali GCC je vratio grešku
      if (errors.length === 0 && stderr.trim()) {
        const lines = stderr.trim().split('\n')
        for (const line of lines) {
          const cleaned = line.replace(/^(?:[a-zA-Z]:)?[^:]+:\d+:\d+:\s+(error|warning):\s*/, '')
          if (cleaned !== line) {
            errors.push({ line: 0, column: 0, type: 'error', message: cleaned })
          }
        }
        if (errors.length === 0) {
          errors.push({ line: 0, column: 0, type: 'error', message: lines[lines.length - 1] })
        }
      }

      // Non-zero izlazni kod = GCC je pao
      const hasError = typeof execErr.code === 'number' || errors.some(e => e.type === 'error')

      return {
        success: !hasError,
        errors,
        stdout,
        stderr,
        exePath: hasError ? undefined : exePath,
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
let runningExePath: string | null = null

async function cleanupExe(exePath: string | null) {
  if (!exePath) return
  try {
    await fs.unlink(exePath)
  } catch {
    // ignore — file may already be deleted or locked on Windows
  }
}

ipcMain.handle('program:run', async (_event, exePath: string) => {
  if (runningProcess) {
    return { success: false, error: 'Program je već pokrenut' }
  }

  try {
    await fs.access(exePath, fs.constants.R_OK)
  } catch {
    return { success: false, error: 'Izvršni fajl nije pronađen' }
  }

  runningExePath = exePath
  runningProcess = spawn(exePath, [], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: os.tmpdir(),
  })

  runningProcess.on('error', (err) => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win && !win.isDestroyed()) {
      win.webContents.send('program:error', err.message)
    }
    const exeToClean = runningExePath
    runningProcess = null
    runningExePath = null
    cleanupExe(exeToClean)
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
    const exeToClean = runningExePath
    runningProcess = null
    runningExePath = null
    cleanupExe(exeToClean)
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
  const exeToClean = runningExePath
  runningProcess = null
  runningExePath = null
  cleanupExe(exeToClean)
  return { success: true }
})

// ---- Ollama LLM integration (streaming) ----

interface LlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

function isValidOllamaUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

let currentLlmAbort: AbortController | null = null

ipcMain.on('llm:chat', async (_event, messages: LlmMessage[]) => {
  if (currentLlmAbort) {
    currentLlmAbort.abort()
    currentLlmAbort = null
  }

  const abort = new AbortController()
  currentLlmAbort = abort

  const win = BrowserWindow.getAllWindows()[0]
  if (!win || win.isDestroyed()) return

  let settings: AppSettings
  try {
    settings = await loadSettings()
  } catch {
    win.webContents.send('llm:error', 'Greška pri učitavanju podešavanja.')
    return
  }

  try {
    const ollamaUrl = settings.llm.ollamaUrl.replace(/\/+$/, '')
    if (!isValidOllamaUrl(ollamaUrl)) {
      win.webContents.send('llm:error', 'Neispravna Ollama URL adresa.')
      return
    }
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: settings.llm.model,
        messages,
        stream: true,
        think: true,
      }),
      signal: abort.signal,
    })

    if (!response.ok) {
      const text = await response.text()
      win.webContents.send('llm:error', `Ollama greška (${response.status}): ${text}`)
      return
    }

    if (!response.body) {
      win.webContents.send('llm:error', 'Ollama nije vratio telo odgovora.')
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      // eslint-disable-next-line no-constant-condition
    while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const json = JSON.parse(line) as {
              message?: { content?: string; thinking?: string; role?: string }
              done?: boolean
            }

            if (json.done) continue

            if (json.message?.thinking) {
              win.webContents.send('llm:chunk', {
                content: json.message.thinking,
                role: 'thinking',
              })
            }

            if (json.message?.content) {
              win.webContents.send('llm:chunk', {
                content: json.message.content,
                role: 'assistant',
              })
            }
          } catch {
            // malformed line — skip
          }
        }
      }

      if (buffer.trim()) {
        try {
          const json = JSON.parse(buffer) as {
            message?: { content?: string; thinking?: string; role?: string }
            done?: boolean
          }
          if (!json.done) {
            if (json.message?.thinking) {
              win.webContents.send('llm:chunk', {
                content: json.message.thinking,
                role: 'thinking',
              })
            }
            if (json.message?.content) {
              win.webContents.send('llm:chunk', {
                content: json.message.content,
                role: 'assistant',
              })
            }
          }
        } catch {
          // incomplete final fragment
        }
      }
    } finally {
      try { reader.cancel() } catch { /* ignore */ }
    }

    try {
      if (win && !win.isDestroyed()) {
        win.webContents.send('llm:done')
      }
    } catch { /* ignore */ }
  } catch (err) {
    if (abort.signal.aborted) return
    const msg = err instanceof Error ? err.message : String(err)
    try {
      if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
        win.webContents.send('llm:error', 'Ollama nije pokrenuta. Pokrenite "ollama serve" ili Ollama aplikaciju.')
      } else {
        win.webContents.send('llm:error', msg)
      }
    } catch { /* ignore */ }
  } finally {
    currentLlmAbort = null
  }
})

ipcMain.on('llm:stop', () => {
  if (currentLlmAbort) {
    currentLlmAbort.abort()
    currentLlmAbort = null
  }
})

ipcMain.handle('llm:check', async (): Promise<{ connected: boolean }> => {
  try {
    const settings = await loadSettings()
    const ollamaUrl = settings.llm.ollamaUrl.replace(/\/+$/, '')
    if (!isValidOllamaUrl(ollamaUrl)) {
      return { connected: false }
    }
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    })
    return { connected: response.ok }
  } catch {
    return { connected: false }
  }
})

function cleanupRunningProcess() {
  if (!runningProcess) return
  if (process.platform === 'win32' && runningProcess.pid) {
    spawn('taskkill', ['/pid', String(runningProcess.pid), '/f', '/t'])
  } else {
    runningProcess.kill('SIGTERM')
  }
  const exeToClean = runningExePath
  runningProcess = null
  runningExePath = null
  cleanupExe(exeToClean)
}

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
  isClosing = true
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
  isClosing = false
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
    if (isClosing) return
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
  cleanupRunningProcess()
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
