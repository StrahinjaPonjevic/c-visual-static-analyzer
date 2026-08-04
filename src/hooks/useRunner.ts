import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import { useTranslation } from "@/i18n/LanguageContext"
import type { TerminalLine } from "@/components/OutputPanel"
import type { GccError, GccResult } from "@/types"

interface UseRunnerOptions {
  modeRef: React.MutableRefObject<'single' | 'project'>
  projectPathRef: React.MutableRefObject<string | null>
  activeFilePathRef: React.MutableRefObject<string | null>
  codeRef: React.MutableRefObject<string>
  fileContentsRef: React.MutableRefObject<Record<string, { content: string; savedContent: string }>>
  setFileContents: React.Dispatch<React.SetStateAction<Record<string, { content: string; savedContent: string }>>>
  setOpenFilePaths: React.Dispatch<React.SetStateAction<string[]>>
  setActiveFilePath: (filePath: string | null) => void
}

export function useRunner({
  modeRef,
  projectPathRef,
  activeFilePathRef,
  codeRef,
  fileContentsRef,
  setFileContents,
  setOpenFilePaths,
  setActiveFilePath,
}: UseRunnerOptions) {
  const { t } = useTranslation()

  const [isCompiling, setIsCompiling] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [terminalOutput, setTerminalOutput] = useState<TerminalLine[]>([])
  const [gccErrors, setGccErrors] = useState<GccError[]>([])
  const terminalIdRef = useRef(1)
  const exePathRef = useRef<string | null>(null)
  const compilingRef = useRef(false)

  const handleRun = useCallback(async () => {
    if (compilingRef.current) return
    compilingRef.current = true

    setIsCompiling(true)
    setTerminalOutput([])
    setGccErrors([])

    setTerminalOutput((prev) => [...prev, { id: terminalIdRef.current++, type: "system", text: t("output.compiling") }])

    try {
      let result: GccResult
      const compileTargetFilePath = activeFilePathRef.current
      const compileCodeContent = codeRef.current

      if (modeRef.current === 'project' && projectPathRef.current) {
        // Save all open dirty files in project before compiling
        for (const [fPath, fState] of Object.entries(fileContentsRef.current)) {
          if (fState.content !== fState.savedContent) {
            const saveRes = await window.api.saveFile(fPath, fState.content)
            if (saveRes.success) {
              setFileContents((prev) => ({
                ...prev,
                [fPath]: { content: fState.content, savedContent: fState.content },
              }))
            } else {
              setTerminalOutput((prev) => [...prev, {
                id: terminalIdRef.current++,
                type: "system",
                text: t("output.saveError", { filePath: fPath, error: saveRes.error || '' }),
              }])
              compilingRef.current = false
              setIsCompiling(false)
              return
            }
          }
        }
        result = await window.api.compileProject(projectPathRef.current, compileTargetFilePath || undefined)
      } else {
        result = await window.api.compileCode(compileCodeContent, compileTargetFilePath || undefined)
        if (result.savedFilePath) {
          const newPath = result.savedFilePath

          setOpenFilePaths((prev) => {
            if (compileTargetFilePath && prev.includes(compileTargetFilePath)) {
              return prev.map((p) => (p === compileTargetFilePath ? newPath : p))
            }
            return prev.includes(newPath) ? prev : [...prev, newPath]
          })

          setFileContents((prev) => {
            const updated = { ...prev }
            if (compileTargetFilePath && compileTargetFilePath !== newPath && updated[compileTargetFilePath]) {
              delete updated[compileTargetFilePath]
            }
            updated[newPath] = { content: compileCodeContent, savedContent: compileCodeContent }
            return updated
          })

          if (activeFilePathRef.current === compileTargetFilePath || !activeFilePathRef.current) {
            setActiveFilePath(newPath)
          }
        }
      }

      setGccErrors(result.errors)

      if (result.error) {
        setTerminalOutput((prev) => [...prev, {
          id: terminalIdRef.current++,
          type: "system",
          text: t("output.compileError", { error: result.error || '' }),
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
        toast.error(t("toasts.compileFailed"))
        compilingRef.current = false
        setIsCompiling(false)
        return
      }

      toast.success(t("toasts.compileSuccess"))

      setTerminalOutput((prev) => [...prev, {
        id: terminalIdRef.current++,
        type: "system",
        text: t("output.compilationSuccessfulStarting"),
      }])

      exePathRef.current = result.exePath || null

      const runResult = await window.api.runProgram(result.exePath!, result.cwd)
      if (!runResult.success) {
        setTerminalOutput((prev) => [...prev, {
          id: terminalIdRef.current++,
          type: "system",
          text: t("output.runError", { error: runResult.error || '' }),
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
        text: t("output.unexpectedError", { error: err instanceof Error ? err.message : String(err) }),
      }])
    }
  }, [t, activeFilePathRef, codeRef, modeRef, projectPathRef, fileContentsRef, setFileContents, setOpenFilePaths, setActiveFilePath])

  const handleStop = useCallback(async () => {
    await window.api.killProgram()
    setIsRunning(false)
    setTerminalOutput((prev) => [...prev, {
      id: terminalIdRef.current++,
      type: "system",
      text: t("output.programStopped"),
    }])
  }, [t])

  const handleClearTerminal = useCallback(() => setTerminalOutput([]), [])

  const handleSendStdin = useCallback((text: string) => {
    window.api.sendStdin(text)
    setTerminalOutput((prev) => {
      if (prev.length === 0) return [{ id: terminalIdRef.current++, type: "stdout", text }]
      const last = prev[prev.length - 1]
      if (last.type === "stdout") {
        const updated = [...prev]
        updated[updated.length - 1] = { ...last, text: last.text + text }
        return updated
      }
      return [...prev, { id: terminalIdRef.current++, type: "stdout", text }]
    })
  }, [])

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
        text: t("output.programFinishedWithCode", { code: code ?? "?" }),
      }])
    })

    const cleanError = window.api.onProgramError((error: string) => {
      setIsRunning(false)
      setTerminalOutput((prev) => [...prev, {
        id: terminalIdRef.current++,
        type: "system",
        text: t("output.unexpectedError", { error }),
      }])
    })

    return () => {
      cleanStdout()
      cleanStderr()
      cleanExit()
      cleanError()
    }
  }, [t])

  return {
    isCompiling,
    isRunning,
    terminalOutput,
    gccErrors,
    setGccErrors,
    handleRun,
    handleStop,
    handleClearTerminal,
    handleSendStdin,
  }
}
