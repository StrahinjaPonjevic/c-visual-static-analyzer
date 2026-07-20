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
import { OutputPanel } from "@/components/OutputPanel"
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog"

function App() {
  const [code, setCode] = useState("// Otvorite C fajl da biste poceli\n")
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null)
  const [showSidePanel, setShowSidePanel] = useState(true)
  const [activeSideTab, setActiveSideTab] = useState<"ai" | "analysis">("ai")
  const [cursorLine, setCursorLine] = useState(1)
  const [cursorColumn, setCursorColumn] = useState(1)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [unsavedAction, setUnsavedAction] = useState<{ resolve: (action: 'save' | 'discard' | 'cancel') => void } | null>(null)
  const savedCodeRef = useRef(code)

  const isDirty = code !== savedCodeRef.current

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
              <ResizablePanel defaultSize="30%" minSize={100}>
                <OutputPanel />
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

        <StatusBar filePath={currentFilePath} line={cursorLine} column={cursorColumn} language={language} />

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
