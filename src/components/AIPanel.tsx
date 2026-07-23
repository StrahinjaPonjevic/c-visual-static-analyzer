import { useState, useRef, useEffect } from "react"
import { Send, Bot, User, Loader2, AlertCircle, StopCircle, ChevronRight, Brain } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MarkdownRenderer } from "@/components/MarkdownRenderer"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface Message {
  id: number
  role: "user" | "assistant"
  content: string
  thinking?: string
  isStreaming?: boolean
}

interface AIPanelProps {
  code: string
}

const SYSTEM_PROMPT = `Ti si AI asistent za učenje C programiranja u okviru desktop aplikacije za vizuelnu statičku analizu koda. Pomažeš studentima da:
- Razumeju strukturu i logiku C koda
- Pronađu i isprave greške (sintaktičke, logičke, memorijske)
- Nauče najbolje prakse u C programiranju
- Razumeju pokazivače, strukture, dinamičku alokaciju memorije
- Interpretiraju GCC warning i error poruke

Odgovaraj kratko i jasno, na srpskom jeziku. Koristi kod primere kad je to korisno. Budi edukativan i strpljiv sa početnicima.`

export function AIPanel({ code }: AIPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      content: "Zdravo! Ja sam vaš AI asistent za programiranje. Mogu vam pomoći sa objašnjavanjem koda, pronalaženjem grešaka i učenjem C programiranja. Kako mogu da pomognem?",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messageIdRef = useRef(2)
  const scrollRef = useRef<HTMLDivElement>(null)
  const streamingRef = useRef(false)
  const thinkingChunksRef = useRef("")
  const contentChunksRef = useRef("")

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    const cleanChunk = window.api.onLlmChunk((data) => {
      if (data.role === "thinking") {
        thinkingChunksRef.current += data.content
      } else {
        contentChunksRef.current += data.content
      }

      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (!last?.isStreaming) return prev
        return prev.map((m) =>
          m.id === last.id
            ? {
                ...m,
                thinking: thinkingChunksRef.current || undefined,
                content: contentChunksRef.current,
              }
            : m
        )
      })
    })

    const cleanDone = window.api.onLlmDone(() => {
      const lastMsgId = messageIdRef.current - 1
      const finalContent = contentChunksRef.current
      const finalThinking = thinkingChunksRef.current
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
      streamingRef.current = false
      setIsLoading(false)
    })

    const cleanError = window.api.onLlmError((err) => {
      setError(err)
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
            id: messageIdRef.current++,
            role: "assistant",
            content: `Greška: ${err}`,
          },
        ]
      })
      thinkingChunksRef.current = ""
      contentChunksRef.current = ""
      streamingRef.current = false
      setIsLoading(false)
    })

    return () => {
      cleanChunk()
      cleanDone()
      cleanError()
    }
  }, [])

  function handleSend() {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: messageIdRef.current++,
      role: "user",
      content: input,
    }

    const assistantMessage: Message = {
      id: messageIdRef.current++,
      role: "assistant",
      content: "",
      isStreaming: true,
    }

    setMessages((prev) => [...prev, userMessage, assistantMessage])
    setInput("")
    setIsLoading(true)
    setError(null)
    streamingRef.current = true
    thinkingChunksRef.current = ""
    contentChunksRef.current = ""

    const apiMessages: { role: string; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ]

    if (code.trim()) {
      apiMessages.push({
        role: "system",
        content: `Trenutni kod u editoru:\n\`\`\`c\n${code}\n\`\`\``,
      })
    }

    for (const msg of messages) {
      if (msg.id === 1) continue
      apiMessages.push({ role: msg.role, content: msg.content })
    }

    apiMessages.push({ role: "user", content: input })

    window.api.sendChatMessage(apiMessages)
  }

  function handleStop() {
    window.api.stopGeneration()
    const finalContent = contentChunksRef.current
    const finalThinking = thinkingChunksRef.current
    streamingRef.current = false

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

    thinkingChunksRef.current = ""
    contentChunksRef.current = ""
    setIsLoading(false)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
            >
              {message.role === "assistant" && (
                <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                  <AvatarFallback className="bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`rounded-lg px-3.5 py-2.5 text-sm leading-relaxed max-w-[85%] ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 border"
                }`}
              >
                {message.role === "assistant" ? (
                  <>
                    {message.thinking && (
                      <Collapsible className="mb-2">
                        <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                          <Brain className="h-3.5 w-3.5" />
                          <span>Misaoni proces</span>
                          <ChevronRight className="h-3 w-3 transition-transform data-[state=open]:rotate-90" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="mt-2 rounded border border-dashed border-muted-foreground/20 bg-muted/30 p-2.5 text-xs text-muted-foreground italic">
                            <MarkdownRenderer content={message.thinking} />
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                    {message.content ? (
                      <>
                        <MarkdownRenderer content={message.content} />
                        {message.isStreaming && (
                          <span className="inline text-primary/70 animate-pulse font-mono text-[0.9em] align-baseline">|</span>
                        )}
                      </>
                    ) : message.isStreaming ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-xs">Razmišljam...</span>
                      </div>
                    ) : null}
                  </>
                ) : (
                  message.content
                )}
              </div>
              {message.role === "user" && (
                <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                  <AvatarFallback className="bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {error && (
        <div className="mx-3 mb-2 flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      <div className="border-t bg-sidebar p-3 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (isLoading) {
              handleStop()
            } else {
              handleSend()
            }
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pitajte nešto o kodu..."
            className="h-9 text-sm"
            disabled={false}
          />
          {isLoading ? (
            <Button
              type="submit"
              size="icon"
              variant="destructive"
              className="h-9 w-9 shrink-0"
            >
              <StopCircle className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              className="h-9 w-9 shrink-0"
              disabled={!input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </form>
      </div>
    </div>
  )
}
