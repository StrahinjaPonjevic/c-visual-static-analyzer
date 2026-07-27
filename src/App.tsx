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
import type { CodeMarker, CppcheckIssue } from "@/types"
import { computeMarkers } from "@/analysis/markers"
import type { AppSettings } from "@/types/settings"
import type { GccError } from "@/types"
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

function App() {
  const [code, setCode] = useState("// Otvorite C fajl da biste poceli\n")
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null)
  const [showSidePanel, setShowSidePanel] = useState(true)
  const [activeSideTab, setActiveSideTab] = useState<"ai" | "analysis">("analysis")
  const [cursorLine, setCursorLine] = useState(1)
  const [cursorColumn, setCursorColumn] = useState(1)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [unsavedAction, setUnsavedAction] = useState<{ resolve: (action: 'save' | 'discard' | 'cancel') => void } | null>(null)
  const savedCodeRef = useRef(code)
  const codeRef = useRef(code)
  codeRef.current = code

  const isDirty = code !== savedCodeRef.current

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

  // ---- Cppcheck auto-trigger ----
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const cppcheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runCppcheck = useCallback(async (codeToAnalyze: string) => {
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

  useEffect(() => {
    if (!settings.cppcheck.autoAnalyze) {
      setCppcheckIssues([])
      return
    }

    if (cppcheckTimeoutRef.current) {
      clearTimeout(cppcheckTimeoutRef.current)
    }
    cppcheckTimeoutRef.current = setTimeout(() => {
      runCppcheck(code)
    }, settings.cppcheck.debounceMs)
    return () => {
      if (cppcheckTimeoutRef.current) {
        clearTimeout(cppcheckTimeoutRef.current)
      }
    }
  }, [code, runCppcheck, settings.cppcheck.autoAnalyze, settings.cppcheck.debounceMs])

  const handleRefreshCppcheck = useCallback(() => {
    if (cppcheckTimeoutRef.current) clearTimeout(cppcheckTimeoutRef.current)
    runCppcheck(code)
  }, [code, runCppcheck])

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

    if (codeRef.current.trim()) {
      apiMessages.push({
        role: "system",
        content: `Trenutni kod u editoru:\n\`\`\`c\n${codeRef.current}\n\`\`\``,
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
  }, [aiInput, isAiLoading, messages])

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

  const language = getLanguageFromPath(currentFilePath)

  const handleSave = useCallback(async () => {
    const latestCode = codeRef.current
    if (currentFilePath) {
      const result = await window.api.saveFile(currentFilePath, latestCode)
      if (result.success) savedCodeRef.current = latestCode
    } else {
      const newPath = await window.api.saveAsFile(latestCode)
      if (newPath) {
        setCurrentFilePath(newPath)
        savedCodeRef.current = latestCode
      }
    }
  }, [currentFilePath])

  const handleNew = useCallback(() => {
    if (isDirty) {
      setShowUnsavedDialog(true)
      setUnsavedAction({
        resolve: (action) => {
          if (action === 'save') {
            handleSave().then(() => {
              setCode("")
              setCurrentFilePath(null)
              savedCodeRef.current = ""
            })
          } else if (action === 'discard') {
            setCode("")
              setCurrentFilePath(null)
              savedCodeRef.current = ""
          }
        }
      })
    } else {
      setCode("")
      setCurrentFilePath(null)
      savedCodeRef.current = ""
    }
  }, [isDirty, handleSave])

  const handleOpen = useCallback(async () => {
    if (isDirty) {
      setShowUnsavedDialog(true)
      setUnsavedAction({
        resolve: async (action) => {
          if (action === 'save') {
            await handleSave()
          }
          if (action !== 'cancel') {
            const result = await window.api.openFile()
            if (result) {
              setCode(result.content)
              setCurrentFilePath(result.filePath)
              savedCodeRef.current = result.content
            }
          }
        }
      })
    } else {
      const result = await window.api.openFile()
      if (result) {
        setCode(result.content)
        setCurrentFilePath(result.filePath)
        savedCodeRef.current = result.content
      }
    }
  }, [isDirty, handleSave])

  useEffect(() => {
    const cleanup = window.api.onMenuOpen(() => {
      handleOpen()
    })
    return cleanup
  }, [handleOpen])

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

  useEffect(() => {
    const cleanup = window.api.onMenuSave(() => {
      handleSave()
    })
    return cleanup
  }, [handleSave])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [handleSave])

  const handleClose = useCallback(() => {
    if (isDirty) {
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
  }, [isDirty, handleSave])

  useEffect(() => {
    const cleanup = window.api.onConfirmClose(() => {
      handleClose()
    })
    return cleanup
  }, [handleClose])

  // ---- GCC compile & run handlers ----

  const handleRun = useCallback(async () => {
    if (!codeRef.current.trim() || compilingRef.current) return
    compilingRef.current = true

    setIsCompiling(true)
    setTerminalOutput([])
    setGccErrors([])

    const id = terminalIdRef.current
    terminalIdRef.current += 1
    setTerminalOutput(prev => [...prev, { id, type: "system", text: "$ Kompajliram..." }])

    try {
      const result = await window.api.compileCode(codeRef.current)
      setGccErrors(result.errors)

      if (result.error) {
        setTerminalOutput(prev => [...prev, {
          id: terminalIdRef.current++,
          type: "system",
          text: `Greška: ${result.error}`,
        }])
        compilingRef.current = false
        setIsCompiling(false)
        return
      }

      if (result.stderr.trim()) {
        setTerminalOutput(prev => [...prev, {
          id: terminalIdRef.current++,
          type: "stderr",
          text: result.stderr,
        }])
      } else if (!result.success && result.errors.length > 0) {
        result.errors.forEach(err => {
          setTerminalOutput(prev => [...prev, {
            id: terminalIdRef.current++,
            type: "stderr",
            text: `${err.message}\n`,
          }])
        })
      }

      if (!result.success) {
        compilingRef.current = false
        setIsCompiling(false)
        return
      }

      // Kompajliranje uspešno — pokreni program
      setTerminalOutput(prev => [...prev, {
        id: terminalIdRef.current++,
        type: "system",
        text: "Kompajliranje uspešno. Pokrećem program...\n",
      }])

      exePathRef.current = result.exePath || null

      const runResult = await window.api.runProgram(result.exePath!)
      if (!runResult.success) {
        setTerminalOutput(prev => [...prev, {
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
      setTerminalOutput(prev => [...prev, {
        id: terminalIdRef.current++,
        type: "system",
        text: `Neočekivana greška: ${err instanceof Error ? err.message : String(err)}`,
      }])
    }
  }, [])

  const handleStop = useCallback(async () => {
    await window.api.killProgram()
    setIsRunning(false)
    setTerminalOutput(prev => [...prev, {
      id: terminalIdRef.current++,
      type: "system",
      text: "Program zaustavljen.\n",
    }])
  }, [])

  const handleClearTerminal = useCallback(() => setTerminalOutput([]), [])

  const handleSendStdin = useCallback((text: string) => {
    window.api.sendStdin(text)
    setTerminalOutput(prev => [...prev, {
      id: terminalIdRef.current++,
      type: "stdout",
      text: text,
    }])
  }, [])

  // Listen for program output from main process
  useEffect(() => {
    const cleanStdout = window.api.onProgramStdout((data: string) => {
      setTerminalOutput(prev => {
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
      setTerminalOutput(prev => [...prev, {
        id: terminalIdRef.current++,
        type: "stderr",
        text: data,
      }])
    })

    const cleanExit = window.api.onProgramExit((code: number | null) => {
      setIsRunning(false)
      setTerminalOutput(prev => [...prev, {
        id: terminalIdRef.current++,
        type: "system",
        text: `\nProgram završen sa izlaznim kodom: ${code ?? "?"}\n`,
      }])
    })

    const cleanError = window.api.onProgramError((error: string) => {
      setIsRunning(false)
      setTerminalOutput(prev => [...prev, {
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

  const fileName = currentFilePath
    ? currentFilePath.split(/[/\\]/).pop() ?? null
    : null

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col bg-background text-foreground dark">
        <TitleBar filePath={currentFilePath} onClose={handleClose} isDirty={isDirty} />
        <Toolbar
          onNew={handleNew}
          onOpen={handleOpen}
          onSave={handleSave}
          showSidePanel={showSidePanel}
          activeSideTab={activeSideTab}
          onToggleAI={handleToggleAI}
          onToggleAnalysis={handleToggleAnalysis}
          onRun={handleRun}
          onStop={handleStop}
          isRunning={isRunning}
          isCompiling={isCompiling}
          onSettings={() => setSettingsOpen(true)}
        />

        <ResizablePanelGroup orientation="horizontal" className="flex-1">
          <ResizablePanel defaultSize={showSidePanel ? "72%" : "100%"} minSize={300}>
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel defaultSize="70%" minSize={200}>
                <Editor
                  value={code}
                  onChange={setCode}
                  onCursorChange={(line, column) => {
                    setCursorLine(line)
                    setCursorColumn(column)
                  }}
                  markers={markers}
                  fontSize={settings.editor.fontSize}
                  tabSize={settings.editor.tabSize}
                  wordWrap={settings.editor.wordWrap}
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize="40%" minSize={100}>
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
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>

        <StatusBar filePath={currentFilePath} line={cursorLine} column={cursorColumn} language={language} gccDetected={gccDetected} gccVersion={gccVersion} cppcheckDetected={cppcheckDetected} cppcheckVersion={cppcheckVersion} />

        <UnsavedChangesDialog
          open={showUnsavedDialog}
          fileName={fileName}
          onSave={() => handleUnsavedDialogClose('save')}
          onDiscard={() => handleUnsavedDialogClose('discard')}
          onCancel={() => handleUnsavedDialogClose('cancel')}
        />

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
