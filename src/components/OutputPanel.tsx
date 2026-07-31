import { useRef, useEffect, useState } from "react"
import { Send, Terminal, Trash2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface TerminalLine {
  id: number
  type: "stdout" | "stderr" | "system"
  text: string
}

interface OutputPanelProps {
  terminalOutput: TerminalLine[]
  isRunning: boolean
  onSendStdin: (text: string) => void
  onClear: () => void
}

export function OutputPanel({
  terminalOutput,
  isRunning,
  onSendStdin,
  onClear,
}: OutputPanelProps) {
  const [stdinInput, setStdinInput] = useState("")
  const terminalEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [terminalOutput])

  useEffect(() => {
    if (isRunning) {
      inputRef.current?.focus()
    }
  }, [isRunning])

  function handleStdinSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stdinInput.trim() && stdinInput !== "") return
    const text = stdinInput
    setStdinInput("")
    onSendStdin(text + "\n")
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex h-7 items-center justify-between bg-background border-b px-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Terminal</span>
        </div>
        <button
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30"
          onClick={onClear}
          disabled={terminalOutput.length === 0}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">
          {terminalOutput.length === 0 ? (
            <p className="text-muted-foreground italic font-sans">Kliknite "Pokreni" za kompajliranje i izvršavanje...</p>
          ) : (
            terminalOutput.map((line) => (
              <span
                key={line.id}
                className={cn(
                  line.type === "stderr" && "text-red-400",
                  line.type === "system" && "text-muted-foreground italic",
                  line.type === "stdout" && "text-foreground"
                )}
              >
                {line.text}
              </span>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>
      </ScrollArea>

      <form onSubmit={handleStdinSubmit} className="border-t p-2 flex gap-2 shrink-0">
        <Input
          ref={inputRef}
          value={stdinInput}
          onChange={(e) => setStdinInput(e.target.value)}
          placeholder={isRunning ? "Unesite ulaz za program..." : "Pokrenite program za unos..."}
          className="h-8 text-xs font-mono"
          disabled={!isRunning}
        />
        <Button
          type="submit"
          size="icon"
          className="h-8 w-8 shrink-0"
          disabled={!isRunning}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  )
}
