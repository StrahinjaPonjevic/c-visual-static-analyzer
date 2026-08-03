import { useRef, useEffect } from "react"
import { Send, Bot, User, Loader2, AlertCircle, StopCircle, ChevronRight, Brain, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MarkdownRenderer } from "@/components/MarkdownRenderer"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { Message } from "@/App"
import { useTranslation } from "@/i18n/LanguageContext"

interface AIPanelProps {
  code: string
  messages: Message[]
  input: string
  onInputChange: (value: string) => void
  isLoading: boolean
  error: string | null
  onSend: () => void
  onStop: () => void
  onClear: () => void
  onApplyCode?: (code: string) => void
}

export function AIPanel({ messages, input, onInputChange, isLoading, error, onSend, onStop, onClear, onApplyCode }: AIPanelProps) {
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollViewportRef = useRef<HTMLElement | null>(null)

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
        <div className="flex items-center gap-1.5">
          <Bot className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{t("ai.title")}</span>
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
