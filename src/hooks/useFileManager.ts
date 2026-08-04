import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { toast } from "sonner"
import type { OnMount } from "@monaco-editor/react"
import { useTranslation } from "@/i18n/LanguageContext"
import type { FileNode } from "@/types/project"

interface UseFileManagerOptions {
  runCppcheckProject: (pPath: string) => Promise<void>
  runCppcheckSingle: (codeToAnalyze: string, filePath?: string) => Promise<void>
}

export function useFileManager({ runCppcheckProject, runCppcheckSingle }: UseFileManagerOptions) {
  const { t } = useTranslation()

  const [mode, setMode] = useState<'single' | 'project'>('single')
  const modeRef = useRef(mode)
  modeRef.current = mode

  const [projectPath, setProjectPath] = useState<string | null>(null)
  const projectPathRef = useRef(projectPath)
  projectPathRef.current = projectPath

  const [projectName, setProjectName] = useState<string | null>(null)
  const [projectTree, setProjectTree] = useState<FileNode[]>([])

  const [showExplorer, setShowExplorer] = useState(false)

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
  const [editorKey, setEditorKey] = useState(0)
  const editorInstanceRef = useRef<Parameters<OnMount>[0] | null>(null)

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

  const handleUndo = useCallback(() => {
    if (editorInstanceRef.current) {
      editorInstanceRef.current.trigger('toolbar', 'undo', null)
    }
  }, [])

  const handleRedo = useCallback(() => {
    if (editorInstanceRef.current) {
      editorInstanceRef.current.trigger('toolbar', 'redo', null)
    }
  }, [])

  const handleApplyAiCode = useCallback((newCode: string) => {
    const editor = editorInstanceRef.current
    if (editor) {
      const model = editor.getModel()
      if (model) {
        editor.executeEdits('ai-apply', [{
          range: model.getFullModelRange(),
          text: newCode,
          forceMoveMarkers: true,
        }])
        editor.pushUndoStop()
        editor.focus()
        handleCodeChange(editor.getValue())
        toast.success(t("toasts.codeApplied"), {
          action: {
            label: t("toasts.undo"),
            onClick: () => handleUndo(),
          },
        })
        return
      }
    }
    handleCodeChange(newCode)
    setEditorKey((k) => k + 1)
    toast.success(t("toasts.codeApplied"), {
      action: {
        label: t("toasts.undo"),
        onClick: () => handleUndo(),
      },
    })
  }, [handleCodeChange, handleUndo, t])

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

  const forceCloseTab = useCallback((filePath: string) => {
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
    setFileContents((prev) => {
      const updated = { ...prev }
      delete updated[filePath]
      return updated
    })
  }, [])

  const handleRefreshTree = useCallback(async () => {
    if (projectPathRef.current) {
      const tree = await window.api.readProjectTree(projectPathRef.current)
      setProjectTree(tree)
    }
  }, [])

  const handleSave = useCallback(async (): Promise<string | null> => {
    const latestCode = codeRef.current
    const targetPath = activeFilePathRef.current
    const isUntitled = !targetPath ||
      targetPath.startsWith('untitled_') ||
      targetPath.includes('cppcheck_') ||
      targetPath.includes('gcc_') ||
      targetPath.includes('/tmp/') ||
      targetPath.includes('\\Temp\\') ||
      (!targetPath.includes('/') && !targetPath.includes('\\'))

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
        toast.success(t("toasts.fileSaved"))
        return targetPath
      }
      toast.error(result.error || t("toasts.fileSaveError"))
      return null
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
        toast.success(t("toasts.fileSaved"))
        return newPath
      }
      return null
    }
  }, [runCppcheckProject, handleRefreshTree, t])

  const handleCloseTab = useCallback((filePath: string) => {
    const fState = fileContentsRef.current[filePath]
    const isDirtyFile = fState ? fState.content !== fState.savedContent : false

    if (!isDirtyFile) {
      forceCloseTab(filePath)
      return
    }

    if (activeFilePathRef.current !== filePath) {
      setActiveFilePath(filePath)
      if (fState) {
        setCode(fState.content)
      }
    }

    setShowUnsavedDialog(true)
    setUnsavedAction({
      resolve: async (action) => {
        if (action === 'save') {
          const savedPath = await handleSave()
          if (savedPath) {
            forceCloseTab(savedPath)
            if (filePath !== savedPath) {
              forceCloseTab(filePath)
            }
          }
        } else if (action === 'discard') {
          forceCloseTab(filePath)
        }
      }
    })
  }, [forceCloseTab, handleSave])

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
      runCppcheckSingle(codeRef.current, activeFilePathRef.current || undefined)
    }
  }, [runCppcheckSingle])

  useEffect(() => {
    const cleanupNew = window.api.onMenuNew(() => handleNew())
    const cleanupOpen = window.api.onMenuOpen(() => handleOpen())
    const cleanupOpenFolder = window.api.onMenuOpenFolder(() => handleOpenFolder())
    const cleanupCloseFolder = window.api.onMenuCloseFolder(() => handleCloseProject())
    const cleanupSave = window.api.onMenuSave(() => handleSave())

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        handleNew()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      cleanupNew()
      cleanupOpen()
      cleanupOpenFolder()
      cleanupCloseFolder()
      cleanupSave()
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleNew, handleOpen, handleOpenFolder, handleCloseProject, handleSave])

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

  const handleUnsavedDialogClose = useCallback((action: 'save' | 'discard' | 'cancel') => {
    setShowUnsavedDialog(false)
    const savedAction = unsavedAction
    setUnsavedAction(null)
    savedAction?.resolve(action)
  }, [unsavedAction])

  const handleReloadExternal = useCallback(() => {
    if (externalChangeData) {
      handleCodeChange(externalChangeData.content)
      setEditorKey((k) => k + 1)
      setExternalChangeData(null)
    }
  }, [externalChangeData, handleCodeChange])

  const activeFileName = activeFilePath
    ? activeFilePath.split(/[/\\]/).pop() ?? null
    : null

  return {
    mode,
    modeRef,
    projectPath,
    projectPathRef,
    projectName,
    projectTree,
    showExplorer,
    setShowExplorer,
    openFilePaths,
    setOpenFilePaths,
    activeFilePath,
    setActiveFilePath,
    activeFilePathRef,
    fileContents,
    setFileContents,
    fileContentsRef,
    code,
    setCode,
    codeRef,
    showSidePanel,
    setShowSidePanel,
    activeSideTab,
    setActiveSideTab,
    cursorLine,
    setCursorLine,
    cursorColumn,
    setCursorColumn,
    showUnsavedDialog,
    externalChangeData,
    setExternalChangeData,
    editorKey,
    editorInstanceRef,
    dirtyFiles,
    isDirty,
    activeFileName,
    handleCodeChange,
    handleUndo,
    handleRedo,
    handleApplyAiCode,
    handleSelectFile,
    forceCloseTab,
    handleRefreshTree,
    handleSave,
    handleCloseTab,
    handleNew,
    handleOpen,
    handleOpenFolder,
    handleCreateFile,
    handleCreateFolder,
    handleRenameItem,
    handleDeleteItem,
    handleCloseProject,
    handleToggleAI,
    handleToggleAnalysis,
    handleClose,
    handleUnsavedDialogClose,
    handleReloadExternal,
  }
}
