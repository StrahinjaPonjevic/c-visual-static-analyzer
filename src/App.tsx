import { useState, useEffect, useCallback, useRef } from "react"
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

  // ---- GCC compile & run state ----
  const [isCompiling, setIsCompiling] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [terminalOutput, setTerminalOutput] = useState<TerminalLine[]>([])
  const terminalIdRef = useRef(1)
  const exePathRef = useRef<string | null>(null)

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
    if (currentFilePath) {
      await window.api.saveFile(currentFilePath, code)
    } else {
      const newPath = await window.api.saveAsFile(code)
      if (newPath) {
        setCurrentFilePath(newPath)
      }
    }
    savedCodeRef.current = code
  }, [currentFilePath, code])

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
    if (!code.trim()) return

    setIsCompiling(true)
    setTerminalOutput([])

    const id = terminalIdRef.current
    terminalIdRef.current += 1
    setTerminalOutput(prev => [...prev, { id, type: "system", text: "$ Kompajliram..." }])

    const result = await window.api.compileCode(code)

    if (result.error) {
      setTerminalOutput(prev => [...prev, {
        id: terminalIdRef.current++,
        type: "system",
        text: `Greška: ${result.error}`,
      }])
      setIsCompiling(false)
      return
    }

    if (!result.success) {
      if (result.stderr.trim()) {
        setTerminalOutput(prev => [...prev, {
          id: terminalIdRef.current++,
          type: "stderr",
          text: result.stderr,
        }])
      } else if (result.errors.length > 0) {
        result.errors.forEach(err => {
          setTerminalOutput(prev => [...prev, {
            id: terminalIdRef.current++,
            type: "stderr",
            text: `${err.message}\n`,
          }])
        })
      }
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
      setIsCompiling(false)
      return
    }

    setIsRunning(true)
    setIsCompiling(false)
  }, [code])

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
              <ResizablePanel defaultSize="28%" minSize={200}>
                <SidePanel
                  activeTab={activeSideTab}
                  code={code}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>

        <StatusBar filePath={currentFilePath} line={cursorLine} column={cursorColumn} language={language} gccDetected={gccDetected} gccVersion={gccVersion} />

        <UnsavedChangesDialog
          open={showUnsavedDialog}
          fileName={fileName}
          onSave={() => handleUnsavedDialogClose('save')}
          onDiscard={() => handleUnsavedDialogClose('discard')}
          onCancel={() => handleUnsavedDialogClose('cancel')}
        />
      </div>
    </TooltipProvider>
  )
}

export default App
