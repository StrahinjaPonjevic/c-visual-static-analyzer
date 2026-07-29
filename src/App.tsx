import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import Editor from "@/components/Editor"
import { Toolbar } from "@/components/Toolbar"
import { TitleBar } from "@/components/TitleBar"
import { SidePanel } from "@/components/SidePanel"
import { StatusBar } from "@/components/StatusBar"
import { OutputPanel, type TerminalLine } from "@/components/OutputPanel"
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog"
import { SettingsDialog } from "@/components/SettingsDialog"
import { FileExplorer } from "@/components/FileExplorer"
import { TabBar } from "@/components/TabBar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { CppcheckIssue, GccError, GccResult } from "@/types"
import type { FileNode } from "@/types/project"
import { computeMarkers } from "@/analysis/markers"
import type { AppSettings } from "@/types/settings"
import { DEFAULT_SETTINGS } from "@/types/settings"

export interface Message {
  id: number
  role: "user" | "assistant"
  content: string
  thinking?: string
  isStreaming?: boolean
}

const SYSTEM_PROMPT = `Ti si AI asistent za učenje C programiranja u okviru desktop aplikacije za vizuelnu statičku analizu koda. Pomažeš studentima da:
- Razumeju strukturu i logiku C koda
- Pronađu i isprave greške (sintaktičke, logičke, memorijske)
- Nauče najbolje prakse u C programiranju
- Razumeju pokazivače, strukture, dinamičku alokaciju memorije
- Interpretiraju GCC warning i error poruke

Odgovaraj kratko i jasno, na srpskom jeziku. Koristi kod primere kad je to korisno. Budi edukativan i strpljiv sa početnicima.`

export function App() {
  const [mode, setMode] = useState<'single' | 'project'>('single')
  const modeRef = useRef(mode)
  modeRef.current = mode

  const [projectPath, setProjectPath] = useState<string | null>(null)
  const projectPathRef = useRef(projectPath)
  projectPathRef.current = projectPath

  const [projectName, setProjectName] = useState<string | null>(null)
  const [projectTree, setProjectTree] = useState<FileNode[]>([])

  const [showExplorer, setShowExplorer] = useState(true)

  const [openFilePaths, setOpenFilePaths] = useState<string[]>([])
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null)
  const activeFilePathRef = useRef(activeFilePath)
  activeFilePathRef.current = activeFilePath

  const [fileContents, setFileContents] = useState<Record<string, { content: string; savedContent: string }>>({})
  const fileContentsRef = useRef(fileContents)
  fileContentsRef.current = fileContents

  const [code, setCode] = useState("// Otvorite C fajl ili projekat da biste počeli\n")
  const codeRef = useRef(code)
  codeRef.current = code

  const [showSidePanel, setShowSidePanel] = useState(true)
  const [activeSideTab, setActiveSideTab] = useState<"ai" | "analysis">("analysis")
  const [cursorLine, setCursorLine] = useState(1)
  const [cursorColumn, setCursorColumn] = useState(1)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [unsavedAction, setUnsavedAction] = useState<{ resolve: (action: 'save' | 'discard' | 'cancel') => void } | null>(null)
  const [externalChangeData, setExternalChangeData] = useState<{ filePath: string; content: string; fileName: string } | null>(null)

  const dirtyFiles = useMemo(() => {
    const dirty = new Set<string>()
    for (const [path, state] of Object.entries(fileContents)) {
      if (state.content !== state.savedContent) {
        dirty.add(path)
      }
    }
    return dirty
  }, [fileContents])

  const isDirty = useMemo(() => {
    if (!activeFilePath) return false
    return dirtyFiles.has(activeFilePath)
  }, [activeFilePath, dirtyFiles])

  // ---- GCC detection ----
  const [gccDetected, setGccDetected] = useState<boolean | undefined>(undefined)
  const [gccVersion, setGccVersion] = useState<string | undefined>(undefined)

  useEffect(() => {
    window.api.checkGcc().then(result => {
      setGccDetected(result.detected)
      setGccVersion(result.version)
    })
  }, [])

  // ---- Cppcheck detection ----
  const [cppcheckDetected, setCppcheckDetected] = useState<boolean | undefined>(undefined)
  const [cppcheckVersion, setCppcheckVersion] = useState<string | undefined>(undefined)

  useEffect(() => {
    window.api.checkCppcheck().then(result => {
      setCppcheckDetected(result.detected)
      setCppcheckVersion(result.version)
    })
  }, [])

  // ---- Settings ----
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    window.api.getSettings().then(setSettings)
  }, [])

  const handleSaveSettings = useCallback(async (newSettings: AppSettings) => {
    setSettings(newSettings)
    const result = await window.api.saveSettings(newSettings)
    if (!result.success) {
      console.error("Failed to save settings:", result.error)
    }
  }, [])

  // ---- Analysis results & markers ----
  const [cppcheckIssues, setCppcheckIssues] = useState<CppcheckIssue[]>([])
  const [gccErrors, setGccErrors] = useState<GccError[]>([])

  const markers = useMemo(
    () => computeMarkers(code, cppcheckIssues, gccErrors),
    [code, cppcheckIssues, gccErrors],
  )

  const activeMarkers = useMemo(() => {
    if (!activeFilePath) return markers
    return markers.filter((m) => {
      if (!m.filePath) return true
      return m.filePath === activeFilePath || activeFilePath.endsWith(m.filePath) || m.filePath.endsWith(activeFilePath.split(/[/\\]/).pop()!)
    })
  }, [markers, activeFilePath])

  const fileErrorCounts = useMemo(() => {
    const counts: Record<string, { errors: number; warnings: number }> = {}
    for (const issue of cppcheckIssues) {
      if (!issue.filePath) continue
      if (!counts[issue.filePath]) counts[issue.filePath] = { errors: 0, warnings: 0 }
      if (issue.severity === 'error') counts[issue.filePath].errors += 1
      else counts[issue.filePath].warnings += 1
    }
    for (const err of gccErrors) {
      if (!err.filePath) continue
      if (!counts[err.filePath]) counts[err.filePath] = { errors: 0, warnings: 0 }
      if (err.type === 'error') counts[err.filePath].errors += 1
      else counts[err.filePath].warnings += 1
    }
    return counts
  }, [cppcheckIssues, gccErrors])

  // ---- Cppcheck auto-trigger ----
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const cppcheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runCppcheckSingle = useCallback(async (codeToAnalyze: string) => {
    setIsAnalyzing(true)
    try {
      const result = await window.api.analyzeCode(codeToAnalyze)
      if (result.success) {
        setCppcheckIssues(result.issues as CppcheckIssue[])
      } else {
        setCppcheckIssues([])
      }
    } catch {
      setCppcheckIssues([])
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  const runCppcheckProject = useCallback(async (pPath: string) => {
    setIsAnalyzing(true)
    try {
      const result = await window.api.analyzeProject(pPath)
      if (result.success) {
        setCppcheckIssues(result.issues as CppcheckIssue[])
      } else {
        setCppcheckIssues([])
      }
    } catch {
      setCppcheckIssues([])
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  useEffect(() => {
    if (!settings.cppcheck.autoAnalyze) {
      setCppcheckIssues([])
      return
    }

    if (cppcheckTimeoutRef.current) {
      clearTimeout(cppcheckTimeoutRef.current)
    }
    cppcheckTimeoutRef.current = setTimeout(() => {
      if (modeRef.current === 'project' && projectPathRef.current) {
        runCppcheckProject(projectPathRef.current)
      } else {
        runCppcheckSingle(code)
      }
    }, settings.cppcheck.debounceMs)
    return () => {
      if (cppcheckTimeoutRef.current) {
        clearTimeout(cppcheckTimeoutRef.current)
      }
    }
  }, [code, runCppcheckSingle, runCppcheckProject, settings.cppcheck.autoAnalyze, settings.cppcheck.debounceMs])

  const handleRefreshCppcheck = useCallback(() => {
    if (cppcheckTimeoutRef.current) clearTimeout(cppcheckTimeoutRef.current)
    if (modeRef.current === 'project' && projectPathRef.current) {
      runCppcheckProject(projectPathRef.current)
    } else {
      runCppcheckSingle(code)
    }
  }, [code, runCppcheckSingle, runCppcheckProject])

  // ---- AI Chat state ----
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      content: "Zdravo! Ja sam vaš AI asistent za programiranje. Mogu vam pomoći sa objašnjavanjem koda, pronalaženjem grešaka i učenjem C programiranja. Kako mogu da pomognem?",
    },
  ])
  const [aiInput, setAiInput] = useState("")
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const aiMessageIdRef = useRef(2)
  const aiStreamingRef = useRef(false)
  const aiThinkingChunksRef = useRef("")
  const aiContentChunksRef = useRef("")

  useEffect(() => {
    const cleanChunk = window.api.onLlmChunk((data) => {
      if (data.role === "thinking") {
        aiThinkingChunksRef.current += data.content
      } else {
        aiContentChunksRef.current += data.content
      }

      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (!last?.isStreaming) return prev
        return prev.map((m) =>
          m.id === last.id
            ? {
                ...m,
                thinking: aiThinkingChunksRef.current || undefined,
                content: aiContentChunksRef.current,
              }
            : m
        )
      })
    })

    const cleanDone = window.api.onLlmDone(() => {
      const lastMsgId = aiMessageIdRef.current - 1
      const finalContent = aiContentChunksRef.current
      const finalThinking = aiThinkingChunksRef.current
      setMessages((prev) =>
        prev.map((m) =>
          m.id === lastMsgId
            ? {
                ...m,
                content: finalContent || "Prazan odgovor.",
                thinking: finalThinking || undefined,
                isStreaming: false,
              }
            : m
        )
      )
      aiStreamingRef.current = false
      setIsAiLoading(false)
    })

    const cleanError = window.api.onLlmError((err) => {
      setAiError(err)
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (last?.isStreaming) {
          return prev.map((m) =>
            m.id === last.id
              ? { ...m, content: `Greška: ${err}`, isStreaming: false }
              : m
          )
        }
        return [
          ...prev,
          {
            id: aiMessageIdRef.current++,
            role: "assistant",
            content: `Greška: ${err}`,
          },
        ]
      })
      aiThinkingChunksRef.current = ""
      aiContentChunksRef.current = ""
      aiStreamingRef.current = false
      setIsAiLoading(false)
    })

    return () => {
      cleanChunk()
      cleanDone()
      cleanError()
    }
  }, [])

  const handleAiSend = useCallback(() => {
    if (!aiInput.trim() || isAiLoading) return

    const userMessage: Message = {
      id: aiMessageIdRef.current++,
      role: "user",
      content: aiInput,
    }

    const assistantMessage: Message = {
      id: aiMessageIdRef.current++,
      role: "assistant",
      content: "",
      isStreaming: true,
    }

    setMessages((prev) => [...prev, userMessage, assistantMessage])
    setAiInput("")
    setIsAiLoading(true)
    setAiError(null)
    aiStreamingRef.current = true
    aiThinkingChunksRef.current = ""
    aiContentChunksRef.current = ""

    const apiMessages: { role: string; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ]

    if (modeRef.current === 'project' && projectPathRef.current) {
      apiMessages.push({
        role: "system",
        content: `Korisnik radi u Project Mode okruženju. Projekat: ${projectName || projectPathRef.current}. Aktivni fajl: ${activeFilePathRef.current || 'nema'}.`,
      })
    }

    if (codeRef.current.trim()) {
      apiMessages.push({
        role: "system",
        content: `Trenutni kod u editoru (${activeFilePathRef.current || 'fajl'}):\n\`\`\`c\n${codeRef.current}\n\`\`\``,
      })
    }

    for (const msg of messages) {
      if (msg.id === 1) continue
      if (msg.isStreaming) continue
      if (!msg.content) continue
      apiMessages.push({ role: msg.role, content: msg.content })
    }

    apiMessages.push({ role: "user", content: aiInput })

    window.api.sendChatMessage(apiMessages)
  }, [aiInput, isAiLoading, messages, projectName])

  const handleAiStop = useCallback(() => {
    window.api.stopGeneration()
    const finalContent = aiContentChunksRef.current
    const finalThinking = aiThinkingChunksRef.current
    aiStreamingRef.current = false

    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (last?.isStreaming) {
        return prev.map((m) =>
          m.id === last.id
            ? {
                ...m,
                content: finalContent || "Prekinuto.",
                thinking: finalThinking || undefined,
                isStreaming: false,
              }
            : m
        )
      }
      return prev
    })

    aiThinkingChunksRef.current = ""
    aiContentChunksRef.current = ""
    setIsAiLoading(false)
  }, [])

  // ---- GCC compile & run state ----
  const [isCompiling, setIsCompiling] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [terminalOutput, setTerminalOutput] = useState<TerminalLine[]>([])
  const terminalIdRef = useRef(1)
  const exePathRef = useRef<string | null>(null)
  const compilingRef = useRef(false)

  function getLanguageFromPath(filePath: string | null): string {
    if (!filePath) return "C"
    const ext = filePath.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'c': case 'h': return 'C'
      case 'cpp': case 'cc': case 'cxx': case 'hpp': return 'C++'
      case 'py': return 'Python'
      case 'js': case 'jsx': case 'ts': case 'tsx': return 'JavaScript'
      case 'json': return 'JSON'
      case 'md': return 'Markdown'
      default: return 'Plain Text'
    }
  }

  const language = getLanguageFromPath(activeFilePath)

  // ---- Tab & File Operations ----

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode)
    if (activeFilePathRef.current) {
      const activePath = activeFilePathRef.current
      setFileContents((prev) => ({
        ...prev,
        [activePath]: {
          content: newCode,
          savedContent: prev[activePath]?.savedContent ?? '',
        },
      }))
    }
  }, [])

  const handleSelectFile = useCallback(async (filePath: string) => {
    if (!openFilePaths.includes(filePath)) {
      setOpenFilePaths((prev) => [...prev, filePath])
    }

    if (!fileContentsRef.current[filePath]) {
      const res = await window.api.readFile(filePath)
      if (res) {
        setFileContents((prev) => ({
          ...prev,
          [filePath]: { content: res.content, savedContent: res.content },
        }))
        setCode(res.content)
      }
    } else {
      setCode(fileContentsRef.current[filePath].content)
    }

    setActiveFilePath(filePath)
  }, [openFilePaths])

  const handleCloseTab = useCallback((filePath: string) => {
    setOpenFilePaths((prev) => {
      const next = prev.filter((p) => p !== filePath)
      if (activeFilePathRef.current === filePath) {
        const nextActive = next[next.length - 1] || null
        setActiveFilePath(nextActive)
        if (nextActive && fileContentsRef.current[nextActive]) {
          setCode(fileContentsRef.current[nextActive].content)
        } else if (!nextActive) {
          setCode("// Prazan editor\n")
        }
      }
      return next
    })
  }, [])

  const handleRefreshTree = useCallback(async () => {
    if (projectPathRef.current) {
      const tree = await window.api.readProjectTree(projectPathRef.current)
      setProjectTree(tree)
    }
  }, [])

  const handleSave = useCallback(async () => {
    const latestCode = codeRef.current
    const targetPath = activeFilePathRef.current
    const isUntitled = !targetPath || targetPath.startsWith('untitled_') || (!targetPath.includes('/') && !targetPath.includes('\\'))

    if (!isUntitled && targetPath) {
      const result = await window.api.saveFile(targetPath, latestCode)
      if (result.success) {
        setFileContents((prev) => ({
          ...prev,
          [targetPath]: { content: latestCode, savedContent: latestCode },
        }))
        if (modeRef.current === 'project' && projectPathRef.current) {
          runCppcheckProject(projectPathRef.current)
        }
      }
    } else {
      const defaultDir = projectPathRef.current || undefined
      const newPath = await window.api.saveAsFile(latestCode, defaultDir)
      if (newPath) {
        setOpenFilePaths((prev) => {
          if (targetPath && prev.includes(targetPath)) {
            return prev.map((p) => (p === targetPath ? newPath : p))
          }
          return prev.includes(newPath) ? prev : [...prev, newPath]
        })
        setFileContents((prev) => {
          const next = { ...prev }
          if (targetPath) delete next[targetPath]
          next[newPath] = { content: latestCode, savedContent: latestCode }
          return next
        })
        setActiveFilePath(newPath)

        if (modeRef.current === 'project' && projectPathRef.current) {
          handleRefreshTree()
          runCppcheckProject(projectPathRef.current)
        }
      }
    }
  }, [runCppcheckProject, handleRefreshTree])

  const handleNew = useCallback(() => {
    const newUntitledName = `untitled_${Date.now()}.c`
    setOpenFilePaths((prev) => [...prev, newUntitledName])
    setFileContents((prev) => ({
      ...prev,
      [newUntitledName]: { content: "", savedContent: "" },
    }))
    setActiveFilePath(newUntitledName)
    setCode("")
  }, [])

  const handleOpen = useCallback(async () => {
    const result = await window.api.openFile()
    if (result) {
      setFileContents((prev) => ({
        ...prev,
        [result.filePath]: { content: result.content, savedContent: result.content },
      }))
      setOpenFilePaths((prev) => (prev.includes(result.filePath) ? prev : [...prev, result.filePath]))
      setActiveFilePath(result.filePath)
      setCode(result.content)
    }
  }, [])

  const handleOpenFolder = useCallback(async () => {
    const result = await window.api.openFolder()
    if (result) {
      setMode('project')
      setProjectPath(result.folderPath)
      setProjectName(result.folderName)
      setProjectTree(result.tree)
      setShowExplorer(true)

      // Find first .c file to auto-open if available
      const findFirstCFile = (nodes: FileNode[]): string | null => {
        for (const n of nodes) {
          if (!n.isDirectory && (n.extension === '.c' || n.extension === '.h')) return n.path
          if (n.isDirectory && n.children) {
            const found = findFirstCFile(n.children)
            if (found) return found
          }
        }
        return null
      }

      const firstFile = findFirstCFile(result.tree)
      if (firstFile) {
        handleSelectFile(firstFile)
      }

      runCppcheckProject(result.folderPath)
    }
  }, [handleSelectFile, runCppcheckProject])

  const handleCreateFile = useCallback(async (parentDir: string, fileName: string) => {
    const targetPath = `${parentDir}/${fileName}`
    const res = await window.api.createProjectFile(targetPath)
    if (res.success) {
      handleRefreshTree()
      handleSelectFile(targetPath)
    }
  }, [handleRefreshTree, handleSelectFile])

  const handleCreateFolder = useCallback(async (parentDir: string, folderName: string) => {
    const targetPath = `${parentDir}/${folderName}`
    const res = await window.api.createProjectFolder(targetPath)
    if (res.success) {
      handleRefreshTree()
    }
  }, [handleRefreshTree])

  const handleRenameItem = useCallback(async (oldPath: string, newPath: string) => {
    const res = await window.api.renameProjectItem(oldPath, newPath)
    if (res.success) {
      handleRefreshTree()
      if (activeFilePathRef.current === oldPath) {
        setActiveFilePath(newPath)
      }
    }
  }, [handleRefreshTree])

  const handleDeleteItem = useCallback(async (targetPath: string) => {
    const res = await window.api.deleteProjectItem(targetPath)
    if (res.success) {
      handleRefreshTree()
      handleCloseTab(targetPath)
    }
  }, [handleRefreshTree, handleCloseTab])

  const handleCloseProject = useCallback(() => {
    setMode('single')
    setProjectPath(null)
    setProjectName(null)
    setProjectTree([])
    setShowExplorer(false)
    if (codeRef.current) {
      runCppcheckSingle(codeRef.current)
    }
  }, [runCppcheckSingle])

  useEffect(() => {
    const cleanupOpen = window.api.onMenuOpen(() => handleOpen())
    const cleanupOpenFolder = window.api.onMenuOpenFolder(() => handleOpenFolder())
    const cleanupCloseFolder = window.api.onMenuCloseFolder(() => handleCloseProject())
    const cleanupSave = window.api.onMenuSave(() => handleSave())

    return () => {
      cleanupOpen()
      cleanupOpenFolder()
      cleanupCloseFolder()
      cleanupSave()
    }
  }, [handleOpen, handleOpenFolder, handleCloseProject, handleSave])

  const handleToggleAI = useCallback(() => {
    if (showSidePanel && activeSideTab === "ai") {
      setShowSidePanel(false)
    } else {
      setShowSidePanel(true)
      setActiveSideTab("ai")
    }
  }, [showSidePanel, activeSideTab])

  const handleToggleAnalysis = useCallback(() => {
    if (showSidePanel && activeSideTab === "analysis") {
      setShowSidePanel(false)
    } else {
      setShowSidePanel(true)
      setActiveSideTab("analysis")
    }
  }, [showSidePanel, activeSideTab])

  const handleClose = useCallback(() => {
    if (dirtyFiles.size > 0) {
      setShowUnsavedDialog(true)
      setUnsavedAction({
        resolve: async (action) => {
          if (action === 'save') {
            await handleSave()
          }
          if (action !== 'cancel') {
            window.api.forceClose()
          }
        }
      })
    } else {
      window.api.forceClose()
    }
  }, [dirtyFiles.size, handleSave])

  useEffect(() => {
    const cleanup = window.api.onConfirmClose(() => {
      handleClose()
    })
    return cleanup
  }, [handleClose])

  // ---- GCC compile & run handlers ----

  const handleRun = useCallback(async () => {
    if (compilingRef.current) return
    compilingRef.current = true

    setIsCompiling(true)
    setTerminalOutput([])
    setGccErrors([])

    setTerminalOutput((prev) => [...prev, { id: terminalIdRef.current++, type: "system", text: "$ Kompajliram..." }])

    try {
      let result: GccResult
      if (modeRef.current === 'project' && projectPathRef.current) {
        // Save all open dirty files in project before compiling
        for (const [fPath, fState] of Object.entries(fileContentsRef.current)) {
          if (fState.content !== fState.savedContent) {
            await window.api.saveFile(fPath, fState.content)
            setFileContents((prev) => ({
              ...prev,
              [fPath]: { content: fState.content, savedContent: fState.content },
            }))
          }
        }
        result = await window.api.compileProject(projectPathRef.current)
      } else {
        result = await window.api.compileCode(codeRef.current)
      }

      setGccErrors(result.errors)

      if (result.error) {
        setTerminalOutput((prev) => [...prev, {
          id: terminalIdRef.current++,
          type: "system",
          text: `Greška: ${result.error}`,
        }])
        compilingRef.current = false
        setIsCompiling(false)
        return
      }

      if (result.stderr.trim()) {
        setTerminalOutput((prev) => [...prev, {
          id: terminalIdRef.current++,
          type: "stderr",
          text: result.stderr,
        }])
      } else if (!result.success && result.errors.length > 0) {
        result.errors.forEach((err) => {
          setTerminalOutput((prev) => [...prev, {
            id: terminalIdRef.current++,
            type: "stderr",
            text: `${err.filePath ? err.filePath + ': ' : ''}${err.message}\n`,
          }])
        })
      }

      if (!result.success) {
        compilingRef.current = false
        setIsCompiling(false)
        return
      }

      // Kompajliranje uspešno — pokreni program
      setTerminalOutput((prev) => [...prev, {
        id: terminalIdRef.current++,
        type: "system",
        text: "Kompajliranje uspešno. Pokrećem program...\n",
      }])

      exePathRef.current = result.exePath || null

      const runResult = await window.api.runProgram(result.exePath!)
      if (!runResult.success) {
        setTerminalOutput((prev) => [...prev, {
          id: terminalIdRef.current++,
          type: "system",
          text: `Greška pri pokretanju: ${runResult.error}`,
        }])
        compilingRef.current = false
        setIsCompiling(false)
        return
      }

      compilingRef.current = false
      setIsRunning(true)
      setIsCompiling(false)
    } catch (err) {
      compilingRef.current = false
      setIsCompiling(false)
      setTerminalOutput((prev) => [...prev, {
        id: terminalIdRef.current++,
        type: "system",
        text: `Neočekivana greška: ${err instanceof Error ? err.message : String(err)}`,
      }])
    }
  }, [])

  const handleStop = useCallback(async () => {
    await window.api.killProgram()
    setIsRunning(false)
    setTerminalOutput((prev) => [...prev, {
      id: terminalIdRef.current++,
      type: "system",
      text: "Program zaustavljen.\n",
    }])
  }, [])

  const handleClearTerminal = useCallback(() => setTerminalOutput([]), [])

  const handleSendStdin = useCallback((text: string) => {
    window.api.sendStdin(text)
    setTerminalOutput((prev) => [...prev, {
      id: terminalIdRef.current++,
      type: "stdout",
      text: text,
    }])
  }, [])

  // Listen for program output from main process
  useEffect(() => {
    const cleanStdout = window.api.onProgramStdout((data: string) => {
      setTerminalOutput((prev) => {
        if (prev.length === 0) return [{ id: terminalIdRef.current++, type: "stdout", text: data }]
        const last = prev[prev.length - 1]
        if (last.type === "stdout") {
          const updated = [...prev]
          updated[updated.length - 1] = { ...last, text: last.text + data }
          return updated
        }
        return [...prev, { id: terminalIdRef.current++, type: "stdout", text: data }]
      })
    })

    const cleanStderr = window.api.onProgramStderr((data: string) => {
      setTerminalOutput((prev) => [...prev, {
        id: terminalIdRef.current++,
        type: "stderr",
        text: data,
      }])
    })

    const cleanExit = window.api.onProgramExit((code: number | null) => {
      setIsRunning(false)
      setTerminalOutput((prev) => [...prev, {
        id: terminalIdRef.current++,
        type: "system",
        text: `\nProgram završen sa izlaznim kodom: ${code ?? "?"}\n`,
      }])
    })

    const cleanError = window.api.onProgramError((error: string) => {
      setIsRunning(false)
      setTerminalOutput((prev) => [...prev, {
        id: terminalIdRef.current++,
        type: "system",
        text: `Greška: ${error}\n`,
      }])
    })

    return () => {
      cleanStdout()
      cleanStderr()
      cleanExit()
      cleanError()
    }
  }, [])

  const handleUnsavedDialogClose = useCallback((action: 'save' | 'discard' | 'cancel') => {
    setShowUnsavedDialog(false)
    const savedAction = unsavedAction
    setUnsavedAction(null)
    savedAction?.resolve(action)
  }, [unsavedAction])

  const handleReloadExternal = useCallback(() => {
    if (externalChangeData) {
      handleCodeChange(externalChangeData.content)
      setExternalChangeData(null)
    }
  }, [externalChangeData, handleCodeChange])

  const activeFileName = activeFilePath
    ? activeFilePath.split(/[/\\]/).pop() ?? null
    : null

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col bg-background text-foreground dark">
        <TitleBar filePath={activeFilePath} onClose={handleClose} isDirty={isDirty} />
        <Toolbar
          onNew={handleNew}
          onOpen={handleOpen}
          onOpenFolder={handleOpenFolder}
          onCloseProject={handleCloseProject}
          onSave={handleSave}
          showSidePanel={showSidePanel}
          activeSideTab={activeSideTab}
          onToggleAI={handleToggleAI}
          onToggleAnalysis={handleToggleAnalysis}
          showExplorer={showExplorer}
          onToggleExplorer={() => setShowExplorer(!showExplorer)}
          onRun={handleRun}
          onStop={handleStop}
          isRunning={isRunning}
          isCompiling={isCompiling}
          onSettings={() => setSettingsOpen(true)}
          mode={mode}
          projectName={projectName}
        />

        <ResizablePanelGroup orientation="horizontal" className="flex-1">
          {showExplorer && (
            <>
              <ResizablePanel defaultSize="20%" minSize={200} maxSize={400}>
                <FileExplorer
                  projectName={projectName}
                  projectPath={projectPath}
                  tree={projectTree}
                  activeFilePath={activeFilePath}
                  fileErrorCounts={fileErrorCounts}
                  onSelectFile={handleSelectFile}
                  onRefreshTree={handleRefreshTree}
                  onCreateFile={handleCreateFile}
                  onCreateFolder={handleCreateFolder}
                  onRenameItem={handleRenameItem}
                  onDeleteItem={handleDeleteItem}
                  onCloseProject={handleCloseProject}
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}

          <ResizablePanel defaultSize={showExplorer ? (showSidePanel ? "52%" : "80%") : (showSidePanel ? "72%" : "100%")} minSize={300}>
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel defaultSize="70%" minSize={200} className="flex flex-col">
                <TabBar
                  openFilePaths={openFilePaths}
                  activeFilePath={activeFilePath}
                  dirtyFiles={dirtyFiles}
                  onSelectTab={handleSelectFile}
                  onCloseTab={handleCloseTab}
                />
                <div className="flex-1">
                  <Editor
                    value={code}
                    onChange={handleCodeChange}
                    onCursorChange={(line, column) => {
                      setCursorLine(line)
                      setCursorColumn(column)
                    }}
                    markers={activeMarkers}
                    fontSize={settings.editor.fontSize}
                    tabSize={settings.editor.tabSize}
                    wordWrap={settings.editor.wordWrap}
                    filePath={activeFilePath}
                  />
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize="30%" minSize={100}>
                <OutputPanel
                  terminalOutput={terminalOutput}
                  isRunning={isRunning}
                  onSendStdin={handleSendStdin}
                  onClear={handleClearTerminal}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          {showSidePanel && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize="28%" minSize={300}>
                <SidePanel
                  activeTab={activeSideTab}
                  code={code}
                  cppcheckIssues={cppcheckIssues}
                  isAnalyzing={isAnalyzing}
                  onRefreshCppcheck={handleRefreshCppcheck}
                  messages={messages}
                  aiInput={aiInput}
                  onAiInputChange={setAiInput}
                  isAiLoading={isAiLoading}
                  aiError={aiError}
                  onAiSend={handleAiSend}
                  onAiStop={handleAiStop}
                  onSelectFile={handleSelectFile}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>

        <StatusBar
          filePath={activeFilePath}
          line={cursorLine}
          column={cursorColumn}
          language={language}
          gccDetected={gccDetected}
          gccVersion={gccVersion}
          cppcheckDetected={cppcheckDetected}
          cppcheckVersion={cppcheckVersion}
        />

        <UnsavedChangesDialog
          open={showUnsavedDialog}
          fileName={activeFileName}
          onSave={() => handleUnsavedDialogClose('save')}
          onDiscard={() => handleUnsavedDialogClose('discard')}
          onCancel={() => handleUnsavedDialogClose('cancel')}
        />

        <Dialog open={externalChangeData !== null} onOpenChange={() => setExternalChangeData(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Fajl promenjen spolja</DialogTitle>
              <DialogDescription>
                Fajl "{externalChangeData?.fileName}" je promenjen od strane drugog programa.
                {isDirty ? " Imate nesnimljene promene. Želiš li da učitaš novu verziju? (Nesnimljene promene biće izgubljene)" : ""}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setExternalChangeData(null)}>
                Zadrži moju verziju
              </Button>
              <Button onClick={handleReloadExternal}>
                Učitaj novu verziju
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <SettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          settings={settings}
          onSave={handleSaveSettings}
        />
      </div>
    </TooltipProvider>
  )
}

export default App
