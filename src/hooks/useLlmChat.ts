import { useState, useEffect, useCallback, useRef } from "react"
import { useTranslation } from "@/i18n/LanguageContext"
import type { ExplainWithAiItem } from "@/components/StaticAnalysisPanel"

export interface Message {
  id: number
  role: "user" | "assistant"
  content: string
  thinking?: string
  isStreaming?: boolean
}

interface UseLlmChatOptions {
  modeRef: React.MutableRefObject<'single' | 'project'>
  projectPathRef: React.MutableRefObject<string | null>
  projectName: string | null
  activeFilePathRef: React.MutableRefObject<string | null>
  codeRef: React.MutableRefObject<string>
  setShowSidePanel: (show: boolean) => void
  setActiveSideTab: (tab: "ai" | "analysis") => void
}

function formatLlmError(err: string, t: (key: string) => string): string {
  if (
    err.includes('Ollama nije pokrenuta') ||
    err.includes('Ollama is not running') ||
    err.includes('ECONNREFUSED') ||
    err.includes('fetch failed')
  ) {
    return t("ai.errors.ollamaNotRunning")
  }
  if (err.includes('Greška pri učitavanju podešavanja') || err.includes('Error loading settings')) {
    return t("ai.errors.settingsLoadError")
  }
  if (err.includes('Neispravna Ollama URL adresa') || err.includes('Invalid Ollama URL')) {
    return t("ai.errors.invalidUrlError")
  }
  if (err.includes('Ollama nije vratio telo odgovora') || err.includes('Ollama returned an empty response body')) {
    return t("ai.errors.noResponseBody")
  }
  return err
}

export function useLlmChat({
  modeRef,
  projectPathRef,
  projectName,
  activeFilePathRef,
  codeRef,
  setShowSidePanel,
  setActiveSideTab,
}: UseLlmChatOptions) {
  const { t } = useTranslation()

  const [messages, setMessages] = useState<Message[]>([])
  const [aiInput, setAiInput] = useState("")
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const aiMessageIdRef = useRef(1)
  const aiStreamingRef = useRef(false)
  const aiThinkingChunksRef = useRef("")
  const aiContentChunksRef = useRef("")

  const getStorageKey = useCallback(() => {
    if (activeFilePathRef.current) {
      if (activeFilePathRef.current.startsWith('untitled_')) {
        return 'chat_history_untitled_session'
      }
      return `chat_history_${activeFilePathRef.current}`
    }
    if (modeRef.current === 'project' && projectPathRef.current) {
      return `chat_history_project_${projectPathRef.current}`
    }
    return 'chat_history_global'
  }, [activeFilePathRef, modeRef, projectPathRef])

  const activePath = activeFilePathRef.current
  const projPath = projectPathRef.current
  const currentMode = modeRef.current

  // Load chat history when active file / project changes
  useEffect(() => {
    const key = getStorageKey()
    try {
      const saved = localStorage.getItem(key)
      if (saved) {
        const parsed = JSON.parse(saved) as Message[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed)
          const maxId = parsed.reduce((max, m) => Math.max(max, m.id), 0)
          aiMessageIdRef.current = maxId + 1
          return
        }
      }
    } catch {
      // ignore
    }
    setMessages([])
  }, [activePath, projPath, currentMode, getStorageKey])

  // Save chat history to localStorage when messages change
  useEffect(() => {
    if (aiStreamingRef.current) return
    const key = getStorageKey()
    try {
      if (messages.length > 0) {
        localStorage.setItem(key, JSON.stringify(messages))
      } else {
        localStorage.removeItem(key)
      }
    } catch {
      // ignore
    }
  }, [messages, getStorageKey])

  useEffect(() => {
    const cleanChunk = window.api.onLlmChunk((data) => {
      if (!aiStreamingRef.current) return
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
      if (!aiStreamingRef.current) return
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
      if (!aiStreamingRef.current) return
      const localizedErr = formatLlmError(err, t)
      const errorMsg = `${t("ai.errorPrefix")}${localizedErr}`
      setAiError(localizedErr)
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (last?.isStreaming) {
          return prev.map((m) =>
            m.id === last.id
              ? { ...m, content: errorMsg, isStreaming: false }
              : m
          )
        }
        return [
          ...prev,
          {
            id: aiMessageIdRef.current++,
            role: "assistant",
            content: errorMsg,
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
  }, [t])

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
      { role: "system", content: t("ai.systemPrompt") },
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
      if (msg.isStreaming) continue
      if (!msg.content) continue
      apiMessages.push({ role: msg.role, content: msg.content })
    }

    apiMessages.push({ role: "user", content: aiInput })

    window.api.sendChatMessage(apiMessages)
  }, [aiInput, isAiLoading, messages, projectName, t, activeFilePathRef, codeRef, modeRef, projectPathRef])

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

  const handleClearAiChat = useCallback(() => {
    if (aiStreamingRef.current) {
      window.api.stopGeneration()
      aiStreamingRef.current = false
    }
    aiThinkingChunksRef.current = ""
    aiContentChunksRef.current = ""
    setIsAiLoading(false)
    setAiError(null)
    setAiInput("")
    setMessages([])
    try {
      localStorage.removeItem(getStorageKey())
    } catch {
      // ignore
    }
  }, [getStorageKey])

  const handleExplainWithAi = useCallback((item: ExplainWithAiItem) => {
    setActiveSideTab('ai')
    setShowSidePanel(true)

    let lineContent = ""
    let codeContext = ""
    const codeLines = codeRef.current.split('\n')

    if (item.line > 0 && item.line <= codeLines.length) {
      lineContent = codeLines[item.line - 1]
      const startLine = Math.max(0, item.line - 4)
      const endLine = Math.min(codeLines.length, item.line + 3)
      codeContext = codeLines.slice(startLine, endLine).map((l, idx) => `${startLine + idx + 1}: ${l}`).join('\n')
    }

    const sourceName = item.source === 'gcc' ? t("ai.explainPrompt.gccSource") : t("ai.explainPrompt.cppcheckSource")
    const fileName = item.filePath ? item.filePath.split(/[/\\]/).pop() : (activeFilePathRef.current ? activeFilePathRef.current.split(/[/\\]/).pop() : 'main.c')

    const prompt = `${t("ai.explainPrompt.intro", { source: sourceName })}

${t("ai.explainPrompt.file")}: ${fileName}
${t("ai.explainPrompt.line")}: ${item.line}
${t("ai.explainPrompt.severity")}: ${item.severity || 'issue'}
${t("ai.explainPrompt.message")}: "${item.message}"

${t("ai.explainPrompt.exactLine", { line: item.line })}
\`\`\`c
${lineContent || ''}
\`\`\`

${t("ai.explainPrompt.context", { line: item.line })}
\`\`\`c
${codeContext || codeRef.current}
\`\`\`

${t("ai.explainPrompt.question")}`

    const userMessage: Message = {
      id: aiMessageIdRef.current++,
      role: "user",
      content: prompt,
    }

    const assistantMessage: Message = {
      id: aiMessageIdRef.current++,
      role: "assistant",
      content: "",
      isStreaming: true,
    }

    setMessages((prev) => [...prev, userMessage, assistantMessage])
    setIsAiLoading(true)
    setAiError(null)
    aiStreamingRef.current = true
    aiThinkingChunksRef.current = ""
    aiContentChunksRef.current = ""

    const apiMessages: { role: string; content: string }[] = [
      { role: "system", content: t("ai.systemPrompt") },
    ]

    if (modeRef.current === 'project' && projectPathRef.current) {
      apiMessages.push({
        role: "system",
        content: `Project: ${projectName || projectPathRef.current}. Active file: ${activeFilePathRef.current || 'none'}.`,
      })
    }

    if (codeRef.current.trim()) {
      apiMessages.push({
        role: "system",
        content: `Current code in editor (${activeFilePathRef.current || 'file'}):\n\`\`\`c\n${codeRef.current}\n\`\`\``,
      })
    }

    for (const msg of messages) {
      if (msg.isStreaming) continue
      if (!msg.content) continue
      apiMessages.push({ role: msg.role, content: msg.content })
    }

    apiMessages.push({ role: "user", content: prompt })

    window.api.sendChatMessage(apiMessages)
  }, [messages, projectName, t, activeFilePathRef, codeRef, modeRef, projectPathRef, setActiveSideTab, setShowSidePanel])

  return {
    messages,
    aiInput,
    setAiInput,
    isAiLoading,
    aiError,
    handleAiSend,
    handleAiStop,
    handleClearAiChat,
    handleExplainWithAi,
  }
}
