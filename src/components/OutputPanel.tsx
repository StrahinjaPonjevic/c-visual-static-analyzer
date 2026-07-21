import { useRef, useEffect, useState } from "react"
import { Terminal, AlertTriangle, FileOutput, Send, XCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface TerminalLine {
  id: number
  type: "stdout" | "stderr" | "system"
  text: string
}

interface OutputPanelProps {
  terminalOutput: TerminalLine[]
  compileErrors: GccError[]
  gccStdout: string
  gccStderr: string
  isRunning: boolean
  onSendStdin: (text: string) => void
  activeTab: string
  onTabChange: (tab: string) => void
}

export function OutputPanel({
  terminalOutput,
  compileErrors,
  gccStdout,
  gccStderr,
  isRunning,
  onSendStdin,
  activeTab,
  onTabChange,
}: OutputPanelProps) {
  const [stdinInput, setStdinInput] = useState("")
  const terminalEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const errorCount = compileErrors.filter(e => e.type === "error").length
  const warningCount = compileErrors.filter(e => e.type === "warning").length

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

  function hasErrors() {
    return errorCount > 0 || warningCount > 0
  }

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="h-full flex flex-col">
      <TabsList className="h-9 rounded-none border-b px-2 justify-start gap-1 bg-transparent shrink-0">
        <TabsTrigger
          value="terminal"
          className="h-7 rounded-sm px-2 text-xs data-[state=active]:bg-muted"
        >
          <Terminal className="h-3.5 w-3.5 mr-1.5" />
          Terminal
        </TabsTrigger>
        <TabsTrigger
          value="problems"
          className="h-7 rounded-sm px-2 text-xs data-[state=active]:bg-muted relative"
        >
          <AlertTriangle className={cn("h-3.5 w-3.5 mr-1.5", hasErrors() && "text-amber-400")} />
          Problemi
          {hasErrors() && (
            <Badge
              variant="destructive"
              className="ml-1 h-4 px-1 text-[10px] leading-none"
            >
              {errorCount > 0 ? errorCount : warningCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="output"
          className="h-7 rounded-sm px-2 text-xs data-[state=active]:bg-muted"
        >
          <FileOutput className="h-3.5 w-3.5 mr-1.5" />
          Output
        </TabsTrigger>
      </TabsList>

      <TabsContent value="terminal" className="flex-1 mt-0 p-0 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1">
          <div className="p-3 font-mono text-xs leading-relaxed">
            {terminalOutput.length === 0 ? (
              <p className="text-muted-foreground italic">Kliknite "Pokreni" za kompajliranje i izvršavanje...</p>
            ) : (
              terminalOutput.map((line) => (
                <div
                  key={line.id}
                  className={cn(
                    "whitespace-pre-wrap break-all",
                    line.type === "stderr" && "text-red-400",
                    line.type === "system" && "text-muted-foreground italic",
                    line.type === "stdout" && "text-foreground"
                  )}
                >
                  {line.text}
                </div>
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
      </TabsContent>

      <TabsContent value="problems" className="flex-1 mt-0 p-0">
        <ScrollArea className="h-full">
          <div className="p-3 space-y-2">
            {!hasErrors() && (
              <p className="text-xs text-muted-foreground italic">Nema pronađenih problema.</p>
            )}
            {compileErrors.map((err, idx) => (
              <div
                key={`gcc-err-${idx}`}
                className={cn(
                  "flex items-start gap-2 rounded-md border p-2 text-sm",
                  err.type === "error" ? "border-red-500/30 bg-red-500/10" : "border-amber-500/30 bg-amber-500/10"
                )}
              >
                <div className={cn(
                  "shrink-0 mt-0.5",
                  err.type === "error" ? "text-red-400" : "text-amber-400"
                )}>
                  {err.type === "error" ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      Linija {err.line}:{err.column}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        err.type === "error" ? "text-red-400 border-red-500/30" : "text-amber-400 border-amber-500/30"
                      )}
                    >
                      {err.type === "error" ? "greška" : "upozorenje"}
                    </Badge>
                  </div>
                  <p className="text-sm mt-0.5 break-words">{err.message}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="output" className="flex-1 mt-0 p-0">
        <ScrollArea className="h-full">
          <div className="p-3 font-mono text-xs leading-relaxed">
            {(gccStdout || gccStderr) ? (
              <>
                {gccStdout && (
                  <div className="mb-2">
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">stdout</p>
                    <pre className="whitespace-pre-wrap text-foreground">{gccStdout}</pre>
                  </div>
                )}
                {gccStderr && (
                  <div>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">stderr</p>
                    <pre className="whitespace-pre-wrap text-red-400">{gccStderr}</pre>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground italic">Čekam na kompajliranje...</p>
            )}
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  )
}
