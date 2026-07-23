import { useState, useEffect, useCallback, useRef } from "react"
import {
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Hash,
  FunctionSquare,
  GitBranch,
  MessageSquare,
  Package,
  AlertCircle,
  Braces,
  Sigma,
  FileType,
  ChevronDown,
  ChevronRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import type { CppcheckIssue } from "@/types"
import { stripCommentsAndStrings } from "@/lib/utils"

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

function computeMetrics(rawCode: string): CodeMetrics {
  const code = stripCommentsAndStrings(rawCode)
  const lines = rawCode.split("\n")
  const totalLines = lines.length
  const nonEmptyLines = lines.filter((l) => l.trim().length > 0).length

  const functionCount = (
    code.match(
      /\b(void|int|char|float|double|long|short|unsigned|signed|static|extern|const)\s+\*?\s*\w+\s*\([^)]*\)\s*\{/g
    ) || []
  ).length

  const elseIfCount = (code.match(/\belse\s+if\s*\(/g) || []).length
  const ifCount = (code.match(/\bif\s*\(/g) || []).length - elseIfCount

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

  const includes = (rawCode.match(/#include\s*[<"]/g) || []).length

  const singleLineComments = (rawCode.match(/\/\/.*$/gm) || []).length
  const multiLineComments = (rawCode.match(/\/\*[\s\S]*?\*\//g) || []).length
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

function getSeverityColor(severity: CppcheckIssue["severity"]): string {
  switch (severity) {
    case "error": return "text-red-400 border-red-500/30"
    case "warning": return "text-amber-400 border-amber-500/30"
    case "style": return "text-blue-400 border-blue-500/30"
    case "performance": return "text-purple-400 border-purple-500/30"
    case "portability": return "text-cyan-400 border-cyan-500/30"
    case "information": return "text-muted-foreground"
  }
}

function getSeverityIcon(severity: CppcheckIssue["severity"]) {
  switch (severity) {
    case "error": return <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
    case "warning": return <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
    case "style": return <CheckCircle className="h-4 w-4 text-blue-400 shrink-0" />
    case "performance": return <CheckCircle className="h-4 w-4 text-purple-400 shrink-0" />
    case "portability": return <AlertCircle className="h-4 w-4 text-cyan-400 shrink-0" />
    case "information": return <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
  }
}

export function StaticAnalysisPanel({ code, onIssuesChange }: StaticAnalysisPanelProps) {
  const [metrics, setMetrics] = useState<CodeMetrics>({
    lines: 0, totalLines: 0, functions: 0, ifStatements: 0, loops: 0,
    arrays: 0, pointers: 0, structs: 0, mallocCalls: 0, freeCalls: 0, includes: 0, comments: 0,
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

  const [metricsOpen, setMetricsOpen] = useState(true)
  const [issuesOpen, setIssuesOpen] = useState(true)

  const errorCount = issues.filter((i) => i.severity === "error").length
  const warningCount = issues.filter((i) => i.severity === "warning").length

  const metricCards = [
    { icon: Hash, label: "Linija koda", value: metrics.lines, sub: `Ukupno ${metrics.totalLines}` },
    { icon: FunctionSquare, label: "Funkcija", value: metrics.functions },
    { icon: GitBranch, label: "If/Else", value: metrics.ifStatements },
    { icon: GitBranch, label: "Petlje", value: metrics.loops },
    { icon: Braces, label: "Nizovi", value: metrics.arrays },
    { icon: Sigma, label: "Pokazivači", value: metrics.pointers },
    { icon: FileType, label: "Struct", value: metrics.structs },
    { icon: MessageSquare, label: "Komentara", value: metrics.comments },
    { icon: Package, label: "malloc/free", value: `${metrics.mallocCalls}/${metrics.freeCalls}` },
    { icon: Package, label: "#include", value: metrics.includes },
  ]

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Error message banner */}
      {errorMessage && (
        <div className="flex items-start gap-2 mx-3 mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-2.5 text-xs shrink-0">
          <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
          <div className="text-red-400">
            <p className="font-medium">Greška pri Cppcheck analizi</p>
            <p className="text-muted-foreground mt-0.5 break-words">{errorMessage}</p>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {/* Metrike section */}
          <Collapsible open={metricsOpen} onOpenChange={setMetricsOpen}>
            <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50">
              {metricsOpen ? <ChevronDown className="h-3.5 w-3.5 -rotate-90 transition-transform" /> : <ChevronRight className="h-3.5 w-3.5 transition-transform" />}
              Metrike
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="grid grid-cols-2 gap-2">
                {metricCards.map((item, i) => (
                  <Card key={i} className="border shadow-none">
                    <CardContent className="p-3 flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{item.value}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{item.label}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Problemi section */}
          <Collapsible open={issuesOpen} onOpenChange={setIssuesOpen}>
            <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50">
              {issuesOpen ? <ChevronDown className="h-3.5 w-3.5 -rotate-90 transition-transform" /> : <ChevronRight className="h-3.5 w-3.5 transition-transform" />}
              Problemi
              {issues.length > 0 && (
                <span className="text-muted-foreground/60 font-normal">
                  ({errorCount > 0 && warningCount > 0
                    ? `${errorCount} grešaka, ${warningCount} upozorenja`
                    : errorCount > 0
                      ? `${errorCount} grešaka`
                      : `${warningCount} upozorenja`})
                </span>
              )}
              <div className="ml-auto" />
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 ml-auto shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  if (timeoutRef.current) clearTimeout(timeoutRef.current)
                  runCppcheck(code)
                }}
                disabled={isAnalyzing}
              >
                <RefreshCw className={`h-3 w-3 ${isAnalyzing ? "animate-spin" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              {issues.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle className="h-8 w-8 text-emerald-400 mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">Nema pronađenih problema</p>
                  <p className="text-xs text-muted-foreground mt-1">Kod izgleda čist!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {issues.map((issue, index) => (
                    <Card key={`${issue.id}-${issue.line}-${index}`} className="border shadow-none">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2.5">
                          {getSeverityIcon(issue.severity)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-xs text-muted-foreground font-medium">
                                Linija {issue.line}
                                {issue.column > 0 && `:${issue.column}`}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 h-4 font-normal ${getSeverityColor(issue.severity)}`}
                              >
                                {issue.severity}
                              </Badge>
                              {issue.cwe && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                                  CWE-{issue.cwe}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm leading-relaxed break-words">{issue.message}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  )
}
