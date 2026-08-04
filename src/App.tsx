import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Toaster, toast } from "sonner"
import { LanguageProvider, useTranslation } from "@/i18n/LanguageContext"
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
import { DependencyDialog } from "@/components/DependencyDialog"
import { SettingsDialog } from "@/components/SettingsDialog"
import { FileExplorer } from "@/components/FileExplorer"
import { TabBar } from "@/components/TabBar"
import { EmptyState } from "@/components/EmptyState"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { CppcheckIssue } from "@/types"
import { computeMarkers } from "@/analysis/markers"
import type { AppSettings } from "@/types/settings"
import { DEFAULT_SETTINGS } from "@/types/settings"
import { useFileManager } from "@/hooks/useFileManager"
import { useLlmChat, type Message } from "@/hooks/useLlmChat"
import { useRunner } from "@/hooks/useRunner"

export type { Message }

interface AppMainProps {
  settings: AppSettings
  onSaveSettings: (newSettings: AppSettings) => Promise<void>
}

function AppMain({ settings, onSaveSettings }: AppMainProps) {
  const { t } = useTranslation()
  // ---- GCC & Cppcheck detection & Dialog ----
  const [gccDetected, setGccDetected] = useState<boolean | undefined>(undefined)
  const [gccVersion, setGccVersion] = useState<string | undefined>(undefined)
  const [cppcheckDetected, setCppcheckDetected] = useState<boolean | undefined>(undefined)
  const [cppcheckVersion, setCppcheckVersion] = useState<string | undefined>(undefined)
  const [dependencyDialogOpen, setDependencyDialogOpen] = useState(false)

  const handleRecheckDependencies = useCallback(() => {
    window.api.checkGcc().then(result => {
      setGccDetected(result.detected)
      setGccVersion(result.version)
    })
    window.api.checkCppcheck().then(result => {
      setCppcheckDetected(result.detected)
      setCppcheckVersion(result.version)
    })
  }, [])

  useEffect(() => {
    handleRecheckDependencies()
  }, [handleRecheckDependencies])

  // ---- Settings Dialog ----
  const [settingsOpen, setSettingsOpen] = useState(false)

  // ---- Cppcheck State & Callbacks ----
  const [cppcheckIssues, setCppcheckIssues] = useState<CppcheckIssue[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const cppcheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runCppcheckSingle = useCallback(async (codeToAnalyze: string, filePath?: string) => {
    setIsAnalyzing(true)
    try {
      const result = await window.api.analyzeCode(codeToAnalyze, filePath)
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

  // ---- Custom Hook 1: File Manager ----
  const fileManager = useFileManager({
    runCppcheckProject,
    runCppcheckSingle,
  })

  // ---- Custom Hook 2: LLM Chat ----
  const llmChat = useLlmChat({
    modeRef: fileManager.modeRef,
    projectPathRef: fileManager.projectPathRef,
    projectName: fileManager.projectName,
    activeFilePathRef: fileManager.activeFilePathRef,
    codeRef: fileManager.codeRef,
    setShowSidePanel: fileManager.setShowSidePanel,
    setActiveSideTab: fileManager.setActiveSideTab,
  })

  // ---- Custom Hook 3: GCC Runner ----
  const runner = useRunner({
    modeRef: fileManager.modeRef,
    projectPathRef: fileManager.projectPathRef,
    activeFilePathRef: fileManager.activeFilePathRef,
    codeRef: fileManager.codeRef,
    fileContentsRef: fileManager.fileContentsRef,
    setFileContents: fileManager.setFileContents,
    setOpenFilePaths: fileManager.setOpenFilePaths,
    setActiveFilePath: fileManager.setActiveFilePath,
  })

  // ---- Cppcheck auto-trigger effect ----
  useEffect(() => {
    if (!settings.cppcheck.autoAnalyze) {
      setCppcheckIssues([])
      return
    }

    if (cppcheckTimeoutRef.current) {
      clearTimeout(cppcheckTimeoutRef.current)
    }
    cppcheckTimeoutRef.current = setTimeout(() => {
      if (fileManager.code && fileManager.code.trim() && fileManager.code !== "// Prazan editor\n") {
        runCppcheckSingle(fileManager.code, fileManager.activeFilePathRef.current || undefined)
      }
    }, settings.cppcheck.debounceMs)
    return () => {
      if (cppcheckTimeoutRef.current) {
        clearTimeout(cppcheckTimeoutRef.current)
      }
    }
  }, [fileManager.code, fileManager.activeFilePathRef, runCppcheckSingle, settings.cppcheck.autoAnalyze, settings.cppcheck.debounceMs])

  const handleRefreshCppcheck = useCallback(() => {
    if (cppcheckTimeoutRef.current) clearTimeout(cppcheckTimeoutRef.current)
    if (fileManager.modeRef.current === 'project' && fileManager.projectPathRef.current) {
      runCppcheckProject(fileManager.projectPathRef.current)
    } else {
      runCppcheckSingle(fileManager.code, fileManager.activeFilePathRef.current || undefined)
    }
  }, [fileManager.code, fileManager.activeFilePathRef, fileManager.modeRef, fileManager.projectPathRef, runCppcheckSingle, runCppcheckProject])

  const { handleCodeChange, handleApplyAiCode, handleReloadExternal } = fileManager
  const { setGccErrors } = runner

  // Clear GCC errors on code edit, AI apply, and external reload
  const handleCodeChangeWithClearGcc = useCallback((newCode: string) => {
    handleCodeChange(newCode)
    setGccErrors([])
  }, [handleCodeChange, setGccErrors])

  const handleApplyCodeWithClearGcc = useCallback((newCode: string) => {
    handleApplyAiCode(newCode)
    setGccErrors([])
  }, [handleApplyAiCode, setGccErrors])

  const handleReloadExternalWithClearGcc = useCallback(() => {
    handleReloadExternal()
    setGccErrors([])
  }, [handleReloadExternal, setGccErrors])

  // ---- Analysis results & markers ----
  const markers = useMemo(
    () => computeMarkers(fileManager.code, cppcheckIssues, runner.gccErrors),
    [fileManager.code, cppcheckIssues, runner.gccErrors],
  )

  const activeMarkers = useMemo(() => {
    const activePath = fileManager.activeFilePath
    if (!activePath) return markers
    return markers.filter((m) => {
      if (!m.filePath) return true
      return m.filePath === activePath || activePath.endsWith(m.filePath) || m.filePath.endsWith(activePath.split(/[/\\]/).pop()!)
    })
  }, [markers, fileManager.activeFilePath])

  const fileErrorCounts = useMemo(() => {
    const counts: Record<string, { errors: number; warnings: number }> = {}
    for (const issue of cppcheckIssues) {
      if (!issue.filePath) continue
      if (!counts[issue.filePath]) counts[issue.filePath] = { errors: 0, warnings: 0 }
      if (issue.severity === 'error') counts[issue.filePath].errors += 1
      else counts[issue.filePath].warnings += 1
    }
    for (const err of runner.gccErrors) {
      if (!err.filePath) continue
      if (!counts[err.filePath]) counts[err.filePath] = { errors: 0, warnings: 0 }
      if (err.type === 'error') counts[err.filePath].errors += 1
      else counts[err.filePath].warnings += 1
    }
    return counts
  }, [cppcheckIssues, runner.gccErrors])

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

  const language = getLanguageFromPath(fileManager.activeFilePath)

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col bg-background text-foreground dark">
        <TitleBar filePath={fileManager.activeFilePath} onClose={fileManager.handleClose} isDirty={fileManager.isDirty} />
        <Toolbar
          onNew={fileManager.handleNew}
          onOpen={fileManager.handleOpen}
          onOpenFolder={fileManager.handleOpenFolder}
          onCloseProject={fileManager.handleCloseProject}
          onSave={fileManager.handleSave}
          onUndo={fileManager.handleUndo}
          onRedo={fileManager.handleRedo}
          showSidePanel={fileManager.showSidePanel}
          activeSideTab={fileManager.activeSideTab}
          onToggleAI={fileManager.handleToggleAI}
          onToggleAnalysis={fileManager.handleToggleAnalysis}
          showExplorer={fileManager.showExplorer}
          onToggleExplorer={() => fileManager.setShowExplorer(!fileManager.showExplorer)}
          onRun={runner.handleRun}
          onStop={runner.handleStop}
          isRunning={runner.isRunning}
          isCompiling={runner.isCompiling}
          onSettings={() => setSettingsOpen(true)}
          mode={fileManager.mode}
          projectName={fileManager.projectName}
        />

        <ResizablePanelGroup orientation="horizontal" className="flex-1">
          {fileManager.showExplorer && (
            <>
              <ResizablePanel defaultSize="20%" minSize={200} maxSize={400}>
                <FileExplorer
                  projectName={fileManager.projectName}
                  projectPath={fileManager.projectPath}
                  tree={fileManager.projectTree}
                  activeFilePath={fileManager.activeFilePath}
                  fileErrorCounts={fileErrorCounts}
                  onSelectFile={fileManager.handleSelectFile}
                  onRefreshTree={fileManager.handleRefreshTree}
                  onCreateFile={fileManager.handleCreateFile}
                  onCreateFolder={fileManager.handleCreateFolder}
                  onRenameItem={fileManager.handleRenameItem}
                  onDeleteItem={fileManager.handleDeleteItem}
                  onCloseProject={fileManager.handleCloseProject}
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}

          <ResizablePanel defaultSize={fileManager.showExplorer ? (fileManager.showSidePanel ? "52%" : "80%") : (fileManager.showSidePanel ? "72%" : "100%")} minSize={300}>
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel defaultSize="70%" minSize={100} className="flex flex-col overflow-hidden">
                <TabBar
                  openFilePaths={fileManager.openFilePaths}
                  activeFilePath={fileManager.activeFilePath}
                  dirtyFiles={fileManager.dirtyFiles}
                  onSelectTab={fileManager.handleSelectFile}
                  onCloseTab={fileManager.handleCloseTab}
                />
                <div className="flex-1 min-h-0 overflow-hidden">
                  {fileManager.openFilePaths.length === 0 || !fileManager.activeFilePath ? (
                    <EmptyState
                      onNew={fileManager.handleNew}
                      onOpen={fileManager.handleOpen}
                      onOpenFolder={fileManager.handleOpenFolder}
                    />
                  ) : (
                    <Editor
                      key={`${fileManager.activeFilePath}_${fileManager.editorKey}`}
                      value={fileManager.code}
                      onChange={handleCodeChangeWithClearGcc}
                      onMount={(ed) => {
                        fileManager.editorInstanceRef.current = ed
                      }}
                      onCursorChange={(line, column) => {
                        fileManager.setCursorLine(line)
                        fileManager.setCursorColumn(column)
                      }}
                      onExplainWithAi={(line, lineContent) => {
                        llmChat.handleExplainWithAi({
                          line,
                          message: `Linija ${line}: \`${lineContent.trim()}\``,
                          source: 'gcc',
                        })
                      }}
                      onDropFilePath={(filePath) => fileManager.handleSelectFile(filePath)}
                      markers={activeMarkers}
                      fontSize={settings.editor.fontSize}
                      tabSize={settings.editor.tabSize}
                      wordWrap={settings.editor.wordWrap}
                      filePath={fileManager.activeFilePath}
                    />
                  )}
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize="30%" minSize={100}>
                <OutputPanel
                  terminalOutput={runner.terminalOutput}
                  isRunning={runner.isRunning}
                  onSendStdin={runner.handleSendStdin}
                  onClear={runner.handleClearTerminal}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          {fileManager.showSidePanel && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize="28%" minSize={300}>
                <SidePanel
                  activeTab={fileManager.activeSideTab}
                  code={fileManager.code}
                  cppcheckIssues={cppcheckIssues}
                  gccErrors={runner.gccErrors}
                  isAnalyzing={isAnalyzing}
                  onRefreshCppcheck={handleRefreshCppcheck}
                  messages={llmChat.messages}
                  aiInput={llmChat.aiInput}
                  onAiInputChange={llmChat.setAiInput}
                  isAiLoading={llmChat.isAiLoading}
                  aiError={llmChat.aiError}
                  modelName={settings.llm.model}
                  onAiSend={llmChat.handleAiSend}
                  onAiStop={llmChat.handleAiStop}
                  onAiClear={llmChat.handleClearAiChat}
                  onSelectFile={fileManager.handleSelectFile}
                  onExplainWithAi={llmChat.handleExplainWithAi}
                  onApplyCode={handleApplyCodeWithClearGcc}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>

        <StatusBar
          filePath={fileManager.activeFilePath}
          line={fileManager.cursorLine}
          column={fileManager.cursorColumn}
          language={language}
          gccDetected={gccDetected}
          gccVersion={gccVersion}
          cppcheckDetected={cppcheckDetected}
          cppcheckVersion={cppcheckVersion}
          onOpenDependencyDialog={() => setDependencyDialogOpen(true)}
        />

        <DependencyDialog
          open={dependencyDialogOpen}
          onOpenChange={setDependencyDialogOpen}
          gccDetected={gccDetected}
          gccVersion={gccVersion}
          cppcheckDetected={cppcheckDetected}
          cppcheckVersion={cppcheckVersion}
          onRecheck={handleRecheckDependencies}
        />

        <UnsavedChangesDialog
          open={fileManager.showUnsavedDialog}
          fileName={fileManager.activeFileName}
          onSave={() => fileManager.handleUnsavedDialogClose('save')}
          onDiscard={() => fileManager.handleUnsavedDialogClose('discard')}
          onCancel={() => fileManager.handleUnsavedDialogClose('cancel')}
        />

        <Dialog open={fileManager.externalChangeData !== null} onOpenChange={() => fileManager.setExternalChangeData(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("dialogs.externalChange.title")}</DialogTitle>
              <DialogDescription>
                {fileManager.isDirty
                  ? t("dialogs.externalChange.descriptionDirty", { fileName: fileManager.externalChangeData?.fileName || "" })
                  : t("dialogs.externalChange.description", { fileName: fileManager.externalChangeData?.fileName || "" })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => fileManager.setExternalChangeData(null)}>
                {t("dialogs.externalChange.ignore")}
              </Button>
              <Button onClick={handleReloadExternalWithClearGcc}>
                {t("dialogs.externalChange.reload")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <SettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          settings={settings}
          onSave={onSaveSettings}
        />
        <Toaster position="bottom-right" theme="dark" richColors />
      </div>
    </TooltipProvider>
  )
}

function AppContainer({
  settings,
  setSettings,
}: {
  settings: AppSettings
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>
}) {
  const { t } = useTranslation()

  const handleSaveSettings = useCallback(
    async (newSettings: AppSettings) => {
      setSettings(newSettings)
      const result = await window.api.saveSettings(newSettings)
      if (!result.success) {
        console.error("Failed to save settings:", result.error)
        toast.error(result.error || t("toasts.settingsSaveError"))
      } else {
        toast.success(t("toasts.settingsSaved"))
      }
    },
    [setSettings, t],
  )

  return <AppMain settings={settings} onSaveSettings={handleSaveSettings} />
}

export function App() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    window.api.getSettings().then(setSettings)
  }, [])

  return (
    <LanguageProvider language={settings.general?.language || 'sr'}>
      <AppContainer settings={settings} setSettings={setSettings} />
    </LanguageProvider>
  )
}

export default App
