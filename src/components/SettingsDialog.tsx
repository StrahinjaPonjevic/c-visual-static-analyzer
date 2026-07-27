import { useState, useEffect } from "react"
import {
  Loader2,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Brain,
  Code,
  ShieldCheck,
  PenTool,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import type { AppSettings } from "@/types/settings"

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
  settings: AppSettings
  onSave: (settings: AppSettings) => void
}

function SettingsSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

function StatusBadge({ status, version }: { status: "loading" | "ok" | "missing"; version?: string }) {
  if (status === "loading") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Proveravam...</span>
      </div>
    )
  }
  if (status === "ok") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-400">
        <CheckCircle className="h-3 w-3" />
        <span>{version || "Dostupno"}</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5 text-xs text-red-400">
      <XCircle className="h-3 w-3" />
      <span>Nije pronađeno</span>
    </div>
  )
}

export function SettingsDialog({ open, onClose, settings, onSave }: SettingsDialogProps) {
  const [local, setLocal] = useState<AppSettings>(settings)
  const [cppcheckStatus, setCppcheckStatus] = useState<"loading" | "ok" | "missing">("loading")
  const [cppcheckVersion, setCppcheckVersion] = useState<string>("")
  const [ollamaStatus, setOllamaStatus] = useState<"loading" | "ok" | "missing">("loading")
  const [sections, setSections] = useState<Record<string, boolean>>({
    llm: true,
    compiler: true,
    cppcheck: true,
    editor: true,
  })

  useEffect(() => {
    let mounted = true
    if (open) {
      setLocal(settings)
      setCppcheckStatus("loading")
      setOllamaStatus("loading")

      window.api.checkCppcheck().then((r) => {
        if (!mounted) return
        setCppcheckStatus(r.detected ? "ok" : "missing")
        setCppcheckVersion(r.version ?? "")
      })

      window.api.checkLlm().then((r) => {
        if (!mounted) return
        setOllamaStatus(r.connected ? "ok" : "missing")
      })
    }
    return () => { mounted = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function update<K extends keyof AppSettings>(
    section: K,
    key: keyof AppSettings[K],
    value: unknown,
  ) {
    setLocal((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }))
  }

  function toggleSection(key: string) {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSave() {
    await onSave(local)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="!max-w-none" style={{ width: 450 }}>
        <DialogHeader>
          <DialogTitle>Podešavanja</DialogTitle>
          <DialogDescription>Konfigurišite podešavanja aplikacije</DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[420px] -mx-6 px-6">
          <div className="space-y-1">
            {/* AI / Ollama */}
            <Collapsible open={sections.llm} onOpenChange={() => toggleSection("llm")}>
              <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50">
                {sections.llm ? (
                  <ChevronDown className="h-3.5 w-3.5 -rotate-90 transition-transform" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 transition-transform" />
                )}
                <Brain className="h-3.5 w-3.5" />
                AI / Ollama
                <div className="ml-auto">
                  <StatusBadge status={ollamaStatus} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-1 pb-2 space-y-2">
                <Card className="border shadow-none">
                  <CardContent className="p-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">URL</span>
                    <Input
                      value={local.llm.ollamaUrl}
                      onChange={(e) => update("llm", "ollamaUrl", e.target.value)}
                      className="h-8 w-56 text-sm"
                      placeholder="http://localhost:11434"
                    />
                  </CardContent>
                </Card>
                <Card className="border shadow-none">
                  <CardContent className="p-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Model</span>
                    <Input
                      value={local.llm.model}
                      onChange={(e) => update("llm", "model", e.target.value)}
                      className="h-8 w-56 text-sm"
                      placeholder="gemma4:e4b"
                    />
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* Compiler */}
            <Collapsible open={sections.compiler} onOpenChange={() => toggleSection("compiler")}>
              <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50">
                {sections.compiler ? (
                  <ChevronDown className="h-3.5 w-3.5 -rotate-90 transition-transform" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 transition-transform" />
                )}
                <Code className="h-3.5 w-3.5" />
                Kompajler
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-1 pb-2 space-y-2">
                <Card className="border shadow-none">
                  <CardContent className="p-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">C standard</span>
                    <SettingsSelect
                      value={local.compiler.cStandard}
                      onChange={(v) => update("compiler", "cStandard", v)}
                      options={[
                        { value: "c99", label: "C99" },
                        { value: "c11", label: "C11" },
                        { value: "c17", label: "C17" },
                        { value: "c23", label: "C23" },
                      ]}
                    />
                  </CardContent>
                </Card>
                <Card className="border shadow-none">
                  <CardContent className="p-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Dodatne zastavice</span>
                    <Input
                      value={local.compiler.extraFlags}
                      onChange={(e) => update("compiler", "extraFlags", e.target.value)}
                      className="h-8 w-56 text-sm"
                      placeholder="-Wall -Wextra"
                    />
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* Cppcheck */}
            <Collapsible open={sections.cppcheck} onOpenChange={() => toggleSection("cppcheck")}>
              <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50">
                {sections.cppcheck ? (
                  <ChevronDown className="h-3.5 w-3.5 -rotate-90 transition-transform" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 transition-transform" />
                )}
                <ShieldCheck className="h-3.5 w-3.5" />
                Cppcheck
                <div className="ml-auto">
                  <StatusBadge status={cppcheckStatus} version={cppcheckVersion} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-1 pb-2 space-y-2">
                <Card className="border shadow-none">
                  <CardContent className="p-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Automatska analiza</span>
                    <button
                      type="button"
                      onClick={() => update("cppcheck", "autoAnalyze", !local.cppcheck.autoAnalyze)}
                      className={`relative h-5 w-9 rounded-full transition-colors ${
                        local.cppcheck.autoAnalyze ? "bg-primary" : "bg-muted border border-border"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
                          local.cppcheck.autoAnalyze ? "translate-x-4" : ""
                        }`}
                      />
                    </button>
                  </CardContent>
                </Card>
                <Card className="border shadow-none">
                  <CardContent className="p-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Debounce (ms)</span>
                    <Input
                      type="number"
                      value={local.cppcheck.debounceMs}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        update("cppcheck", "debounceMs", isNaN(v) ? 600 : Math.max(100, v))
                      }}
                      className="h-8 w-20 text-sm"
                      min={100}
                      step={100}
                    />
                  </CardContent>
                </Card>
                <Card className="border shadow-none">
                  <CardContent className="p-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Dodatne zastavice</span>
                    <Input
                      value={local.cppcheck.extraFlags}
                      onChange={(e) => update("cppcheck", "extraFlags", e.target.value)}
                      className="h-8 w-56 text-sm"
                      placeholder="--enable=warning"
                    />
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* Editor */}
            <Collapsible open={sections.editor} onOpenChange={() => toggleSection("editor")}>
              <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50">
                {sections.editor ? (
                  <ChevronDown className="h-3.5 w-3.5 -rotate-90 transition-transform" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 transition-transform" />
                )}
                <PenTool className="h-3.5 w-3.5" />
                Editor
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-1 pb-2 space-y-2">
                <Card className="border shadow-none">
                  <CardContent className="p-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Veličina fonta</span>
                    <Input
                      type="number"
                      value={local.editor.fontSize}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        update("editor", "fontSize", isNaN(v) ? 14 : Math.max(8, Math.min(32, v)))
                      }}
                      className="h-8 w-20 text-sm"
                      min={8}
                      max={32}
                    />
                  </CardContent>
                </Card>
                <Card className="border shadow-none">
                  <CardContent className="p-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Veličina taba</span>
                    <SettingsSelect
                      value={String(local.editor.tabSize)}
                      onChange={(v) => update("editor", "tabSize", Number(v))}
                      options={[
                        { value: "2", label: "2" },
                        { value: "4", label: "4" },
                        { value: "8", label: "8" },
                      ]}
                    />
                  </CardContent>
                </Card>
                <Card className="border shadow-none">
                  <CardContent className="p-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Prelom linija</span>
                    <SettingsSelect
                      value={local.editor.wordWrap}
                      onChange={(v) => update("editor", "wordWrap", v)}
                      options={[
                        { value: "off", label: "Isključen" },
                        { value: "on", label: "Uključen" },
                      ]}
                    />
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Otkaži
          </Button>
          <Button onClick={handleSave}>
            Sačuvaj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
