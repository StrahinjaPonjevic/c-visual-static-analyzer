import { useState, useMemo } from "react"
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
  Sparkles,
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
import type { CppcheckIssue, GccError } from "@/types"
import { computeMetrics } from "@/analysis/parsers"

export interface ExplainWithAiItem {
  line: number
  message: string
  severity?: string
  filePath?: string
  source: 'cppcheck' | 'gcc'
}

interface StaticAnalysisPanelProps {
  code: string
  cppcheckIssues: CppcheckIssue[]
  gccErrors?: GccError[]
  isAnalyzing: boolean
  onRefreshCppcheck: () => void
  onSelectFile?: (filePath: string, line?: number) => void
  onExplainWithAi?: (item: ExplainWithAiItem) => void
}

function getFileName(filePath?: string): string {
  if (!filePath) return ''
  const parts = filePath.split(/[/\\]/)
  return parts[parts.length - 1] || filePath
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case "error": return "text-red-400 border-red-500/30"
    case "warning": return "text-amber-400 border-amber-500/30"
    case "style": return "text-blue-400 border-blue-500/30"
    case "performance": return "text-purple-400 border-purple-500/30"
    case "portability": return "text-cyan-400 border-cyan-500/30"
    case "information": return "text-muted-foreground"
    default: return "text-muted-foreground"
  }
}

function getSeverityIcon(severity: string) {
  switch (severity) {
    case "error": return <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
    case "warning": return <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
    case "style": return <CheckCircle className="h-4 w-4 text-blue-400 shrink-0" />
    case "performance": return <CheckCircle className="h-4 w-4 text-purple-400 shrink-0" />
    case "portability": return <AlertCircle className="h-4 w-4 text-cyan-400 shrink-0" />
    default: return <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
  }
}

export function StaticAnalysisPanel({
  code,
  cppcheckIssues,
  gccErrors = [],
  isAnalyzing,
  onRefreshCppcheck,
  onSelectFile,
  onExplainWithAi,
}: StaticAnalysisPanelProps) {
  const metrics = useMemo(() => computeMetrics(code), [code])

  const [metricsOpen, setMetricsOpen] = useState(true)
  const [issuesOpen, setIssuesOpen] = useState(true)

  // Merge Cppcheck issues and GCC errors into a single unified list
  const combinedIssues = useMemo(() => {
    const list: ExplainWithAiItem[] = []

    for (const issue of cppcheckIssues) {
      list.push({
        line: issue.line,
        message: issue.message,
        severity: issue.severity,
        filePath: issue.filePath,
        source: 'cppcheck',
      })
    }

    for (const err of gccErrors) {
      list.push({
        line: err.line,
        message: err.message,
        severity: err.type,
        filePath: err.filePath,
        source: 'gcc',
      })
    }

    return list
  }, [cppcheckIssues, gccErrors])

  const errorCount = combinedIssues.filter((i) => i.severity === "error").length
  const warningCount = combinedIssues.filter((i) => i.severity === "warning" || i.severity === "style" || i.severity === "performance" || i.severity === "portability").length

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
              {combinedIssues.length > 0 && (
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
                  onRefreshCppcheck()
                }}
                disabled={isAnalyzing}
              >
                <RefreshCw className={`h-3 w-3 ${isAnalyzing ? "animate-spin" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              {combinedIssues.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle className="h-8 w-8 text-emerald-400 mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">Nema pronađenih problema</p>
                  <p className="text-xs text-muted-foreground mt-1">Kod izgleda čist!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {combinedIssues.map((issue, index) => (
                    <Card
                      key={`${issue.source}-${issue.line}-${index}`}
                      className="border shadow-none hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => {
                        if (issue.filePath && onSelectFile) {
                          onSelectFile(issue.filePath, issue.line)
                        }
                      }}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2.5">
                          {getSeverityIcon(issue.severity || 'error')}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-semibold text-purple-400">
                                {issue.source.toUpperCase()}
                              </Badge>
                              {issue.filePath && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-semibold text-blue-400">
                                  {getFileName(issue.filePath)}
                                </Badge>
                              )}
                              {issue.line > 0 && (
                                <span className="text-xs text-muted-foreground font-medium">
                                  Linija {issue.line}
                                </span>
                              )}
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 h-4 font-normal ${getSeverityColor(issue.severity || 'error')}`}
                              >
                                {issue.severity}
                              </Badge>
                            </div>
                            <p className="text-sm leading-relaxed break-words mb-2">{issue.message}</p>
                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 gap-1 px-2 text-[11px] font-medium hover:bg-primary/20 hover:text-primary border-primary/30"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onExplainWithAi?.(issue)
                                }}
                              >
                                <Sparkles className="h-3 w-3 text-amber-400" />
                                <span>Objasni sa AI</span>
                              </Button>
                            </div>
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

