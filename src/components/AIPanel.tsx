import { useRef, useEffect, useState } from "react"
import { Send, Bot, User, Loader2, AlertCircle, StopCircle, ChevronRight, Brain, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MarkdownRenderer } from "@/components/MarkdownRenderer"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { Message } from "@/App"
import { useTranslation } from "@/i18n/LanguageContext"
import { cn } from "@/lib/utils"

interface AIPanelProps {
  code: string
  messages: Message[]
  input: string
  onInputChange: (value: string) => void
  isLoading: boolean
  error: string | null
  modelName?: string
  onSend: () => void
  onStop: () => void
  onClear: () => void
  onApplyCode?: (code: string) => void
}

export function AIPanel({ messages, input, onInputChange, isLoading, error, modelName, onSend, onStop, onClear, onApplyCode }: AIPanelProps) {
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollViewportRef = useRef<HTMLElement | null>(null)
  const [isOnline, setIsOnline] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    let isMounted = true
    const checkService = () => {
      window.api.checkLlm().then((res) => {
        if (isMounted) setIsOnline(res.connected)
      }).catch(() => {
        if (isMounted) setIsOnline(false)
      })
    }

    checkService()
    const interval = setInterval(checkService, 12000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [modelName, isLoading])

  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector<HTMLElement>("[data-radix-scroll-area-viewport]")
      if (viewport) scrollViewportRef.current = viewport
    }
  }, [])

  function isNearBottom() {
    if (!scrollViewportRef.current) return true
    const { scrollTop, scrollHeight, clientHeight } = scrollViewportRef.current
    return scrollHeight - scrollTop - clientHeight < 150
  }

  useEffect(() => {
    if (scrollViewportRef.current && isNearBottom()) {
      scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-7 items-center justify-between bg-background border-b px-3 shrink-0">
        <div className="flex items-center gap-2 truncate">
          <Bot className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground font-medium hidden sm:inline">{t("ai.title")}</span>

          {/* Model & Online status indicator */}
          <div
            className="flex items-center gap-1.5 rounded-full bg-muted/60 px-2 py-0.5 border text-[10px] select-none"
            title={
              isOnline === undefined
                ? t("common.checking")
                : isOnline
                  ? `${t("ai.statusConnected")} (${modelName || "Ollama"})`
                  : t("ai.statusDisconnected")
            }
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-colors shrink-0",
                isOnline === undefined && "bg-amber-400 animate-pulse",
                isOnline === true && "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]",
                isOnline === false && "bg-red-400"
              )}
            />
            <span className="font-mono text-muted-foreground truncate max-w-[110px]">
              {modelName || "Ollama"}
            </span>
            <span className="text-[9px] text-muted-foreground/70 hidden sm:inline">
              {isOnline === undefined ? t("common.checking") : isOnline ? t("ai.online") : t("ai.offline")}
            </span>
          </div>
        </div>

        <button
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30"
          onClick={onClear}
          disabled={(messages.length === 0 && !error) || isLoading}
          title={t("ai.clearChat")}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4 min-w-0">
          {messages.length === 0 && (
            <div className="flex gap-3 min-w-0">
              <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                <AvatarFallback className="bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="rounded-lg px-3.5 py-2.5 text-sm leading-relaxed max-w-[85%] min-w-0 bg-muted/60 border break-words">
                {t("ai.greeting")}
              </div>
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 min-w-0 ${message.role === "user" ? "justify-end" : ""}`}
            >
              {message.role === "assistant" && (
                <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                  <AvatarFallback className="bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`rounded-lg px-3.5 py-2.5 text-sm leading-relaxed max-w-[85%] min-w-0 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground break-all"
                    : "bg-muted/60 border break-words"
                }`}
              >
                {message.role === "assistant" ? (
                  <>
                    {message.thinking && (
                      <Collapsible className="mb-2">
                        <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                          <Brain className="h-3.5 w-3.5" />
                          <span>{t("ai.thoughtProcess")}</span>
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
                        <MarkdownRenderer content={message.content} onApplyCode={onApplyCode} />
                        {message.isStreaming && (
                          <span className="inline-flex items-center gap-0.5 ml-1 align-baseline">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
                          </span>
                        )}
                      </>
                    ) : message.isStreaming ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-xs">{t("ai.thinking")}</span>
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
              onStop()
            } else {
              onSend()
            }
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={t("ai.placeholder")}
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
