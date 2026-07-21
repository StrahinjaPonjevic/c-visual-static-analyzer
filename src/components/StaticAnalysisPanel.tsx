import { useState, useEffect, useCallback, useRef } from "react"
import {
  FileCode,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Hash,
  FunctionSquare,
  GitBranch,
  MessageSquare,
  Package,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { CppcheckIssue } from "@/types"

interface CodeMetrics {
  lines: number
  totalLines: number
  functions: number
  ifStatements: number
  loops: number
  arrays: number
  pointers: number
  structs: number
  mallocCalls: number
  freeCalls: number
  includes: number
  comments: number
}

interface StaticAnalysisPanelProps {
  code: string
  onIssuesChange?: (issues: CppcheckIssue[]) => void
}

function computeMetrics(code: string): CodeMetrics {
  const lines = code.split("\n")
  const totalLines = lines.length
  const nonEmptyLines = lines.filter((l) => l.trim().length > 0).length

  const functionCount = (
    code.match(
      /\b(void|int|char|float|double|long|short|unsigned|signed|static|extern|const)\s+\*?\s*\w+\s*\([^)]*\)\s*\{/g
    ) || []
  ).length

  const ifCount = (code.match(/\bif\s*\(/g) || []).length
  const elseIfCount = (code.match(/\belse\s+if\s*\(/g) || []).length

  const forCount = (code.match(/\bfor\s*\(/g) || []).length
  const whileCount = (code.match(/\bwhile\s*\(/g) || []).length
  const doCount = (code.match(/\bdo\s*\{/g) || []).length
  const loops = forCount + whileCount + doCount

  const pointerMatches = code.match(/\b\w+\s*\*\s*\w+(\s*=|\s*;|\s*,|\s*\))/g) || []
  const pointers = pointerMatches.length

  const arrayMatches = code.match(/\w+\s*\[\s*\d*\s*\]/g) || []
  const arrays = arrayMatches.length

  const structMatches = code.match(/\bstruct\s+\w+\s*\{/g) || []
  const structs = structMatches.length

  const mallocCalls = (code.match(/\bmalloc\s*\(/g) || []).length
  const freeCalls = (code.match(/\bfree\s*\(/g) || []).length

  const includes = (code.match(/#include\s*[<"]/g) || []).length

  const singleLineComments = (code.match(/\/\/.*$/gm) || []).length
  const multiLineComments = (code.match(/\/\*[\s\S]*?\*\//g) || []).length
  const comments = singleLineComments + multiLineComments

  return {
    lines: nonEmptyLines,
    totalLines,
    functions: functionCount,
    ifStatements: ifCount + elseIfCount,
    loops,
    arrays,
    pointers,
    structs,
    mallocCalls,
    freeCalls,
    includes,
    comments,
  }
}

export function StaticAnalysisPanel({ code, onIssuesChange }: StaticAnalysisPanelProps) {
  const [metrics, setMetrics] = useState<CodeMetrics>({
    lines: 0,
    totalLines: 0,
    functions: 0,
    ifStatements: 0,
    loops: 0,
    arrays: 0,
    pointers: 0,
    structs: 0,
    mallocCalls: 0,
    freeCalls: 0,
    includes: 0,
    comments: 0,
  })
  const [issues, setIssues] = useState<CppcheckIssue[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runCppcheck = useCallback(async (codeToAnalyze: string) => {
    setIsAnalyzing(true)
    setErrorMessage(null)
    try {
      const result = await window.api.analyzeCode(codeToAnalyze)
      if (result.success) {
        const issues = result.issues as CppcheckIssue[]
        setIssues(issues)
        onIssuesChange?.(issues)
      } else {
        setErrorMessage(result.error || "Greška pri analizi")
        setIssues([])
        onIssuesChange?.([])
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Nepoznata greška")
      setIssues([])
      onIssuesChange?.([])
    } finally {
      setIsAnalyzing(false)
    }
  }, [onIssuesChange])

  const analyzeCode = useCallback(() => {
    const computed = computeMetrics(code)
    setMetrics(computed)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      runCppcheck(code)
    }, 600)
  }, [code, runCppcheck])

  useEffect(() => {
    analyzeCode()
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [analyzeCode])

  function getSeverityColor(severity: CppcheckIssue["severity"]) {
    switch (severity) {
      case "error":
        return "text-red-400"
      case "warning":
        return "text-amber-400"
      case "style":
        return "text-blue-400"
      case "performance":
        return "text-purple-400"
      case "portability":
        return "text-cyan-400"
      case "information":
        return "text-muted-foreground"
    }
  }

  function getSeverityIcon(severity: CppcheckIssue["severity"]) {
    switch (severity) {
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
      case "style":
        return <CheckCircle className="h-4 w-4 text-blue-400 shrink-0" />
      case "performance":
        return <CheckCircle className="h-4 w-4 text-purple-400 shrink-0" />
      case "portability":
        return <AlertCircle className="h-4 w-4 text-cyan-400 shrink-0" />
      case "information":
        return <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
    }
  }

  const errorCount = issues.filter((i) => i.severity === "error").length
  const warningCount = issues.filter((i) => i.severity === "warning").length

  return (
    <div className="flex h-full flex-col bg-sidebar overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <FileCode className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">Statička Analiza</span>
          {isAnalyzing && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
            runCppcheck(code)
          }}
          disabled={isAnalyzing}
        >
          <RefreshCw className={`h-4 w-4 ${isAnalyzing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {errorMessage && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-400">Greška pri Cppcheck analizi</p>
                <p className="text-xs text-muted-foreground mt-1 break-words">
                  {(() => {
                    const urlMatch = errorMessage.match(/https?:\/\/[^\s]+/)
                    if (urlMatch) {
                      const url = urlMatch[0]
                      return (
                        <>
                          {errorMessage.substring(0, urlMatch.index)}
                          <Button variant="link" asChild className="h-auto p-0 text-xs font-normal inline">
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              {url}
                            </a>
                          </Button>
                        </>
                      )
                    }
                    return errorMessage
                  })()}
                </p>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              Metrike Koda
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 rounded-md bg-muted p-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">{metrics.lines}</div>
                  <div className="text-xs text-muted-foreground">Linija koda</div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-muted p-2">
                <FunctionSquare className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">{metrics.functions}</div>
                  <div className="text-xs text-muted-foreground">Funkcija</div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-muted p-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">{metrics.ifStatements}</div>
                  <div className="text-xs text-muted-foreground">If/Else</div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-muted p-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">{metrics.loops}</div>
                  <div className="text-xs text-muted-foreground">Petlje</div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-muted p-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">{metrics.arrays}</div>
                  <div className="text-xs text-muted-foreground">Nizovi</div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-muted p-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">{metrics.pointers}</div>
                  <div className="text-xs text-muted-foreground">Pokazivači</div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-muted p-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">{metrics.structs}</div>
                  <div className="text-xs text-muted-foreground">Struct</div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-muted p-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">{metrics.comments}</div>
                  <div className="text-xs text-muted-foreground">Komentara</div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-muted p-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">
                    {metrics.mallocCalls}/{metrics.freeCalls}
                  </div>
                  <div className="text-xs text-muted-foreground">malloc/free</div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-muted p-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">{metrics.includes}</div>
                  <div className="text-xs text-muted-foreground">#include</div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Cppcheck Rezultati
              </h3>
              <div className="flex gap-2">
                {errorCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {errorCount} grešaka
                  </Badge>
                )}
                {warningCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-amber-500/20 text-amber-400"
                  >
                    {warningCount} upozorenja
                  </Badge>
                )}
              </div>
            </div>

            {isAnalyzing && issues.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Analiziram kod...
                </span>
              </div>
            ) : issues.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle className="h-8 w-8 text-emerald-400 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nema pronađenih problema
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Kod izgleda čist!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {issues.map((issue, index) => (
                  <div
                    key={`${issue.id}-${issue.line}-${index}`}
                    className="flex items-start gap-2 rounded-md border p-2 text-sm"
                  >
                    {getSeverityIcon(issue.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          Linija {issue.line}
                          {issue.column > 0 && `:${issue.column}`}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getSeverityColor(issue.severity)}`}
                        >
                          {issue.severity}
                        </Badge>
                        {issue.cwe && (
                          <Badge variant="outline" className="text-xs">
                            CWE-{issue.cwe}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm mt-0.5 break-words">
                        {issue.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
