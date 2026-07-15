import { useState, useEffect, useCallback } from "react"
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

function App() {
  const [code, setCode] = useState("// Otvorite C fajl da biste poceli\n")
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null)
  const [showSidePanel, setShowSidePanel] = useState(true)
  const [activeSideTab, setActiveSideTab] = useState<"ai" | "analysis">("ai")

  useEffect(() => {
    const cleanup = window.api.onMenuOpen(async () => {
      const result = await window.api.openFile()
      if (result) {
        setCode(result.content)
        setCurrentFilePath(result.filePath)
      }
    })
    return cleanup
  }, [])

  const handleSave = useCallback(async () => {
    if (currentFilePath) {
      await window.api.saveFile(currentFilePath, code)
    } else {
      const newPath = await window.api.saveAsFile(code)
      if (newPath) {
        setCurrentFilePath(newPath)
      }
    }
  }, [currentFilePath, code])

  const handleNew = useCallback(() => {
    setCode("")
    setCurrentFilePath(null)
  }, [])

  const handleOpen = useCallback(async () => {
    const result = await window.api.openFile()
    if (result) {
      setCode(result.content)
      setCurrentFilePath(result.filePath)
    }
  }, [])

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

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col bg-background text-foreground dark">
        <TitleBar filePath={currentFilePath} />
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
                <Editor value={code} onChange={setCode} />
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
                  onTabChange={setActiveSideTab}
                  code={code}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>

        <StatusBar filePath={currentFilePath} />
      </div>
    </TooltipProvider>
  )
}

export default App
