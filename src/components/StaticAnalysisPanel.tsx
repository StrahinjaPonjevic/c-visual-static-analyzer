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
  Activity,
  ShieldAlert,
  Download,
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
import { useTranslation } from "@/i18n/LanguageContext"

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
  const { t } = useTranslation()
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

  const metricCards = [
    { icon: Hash, label: t("analysis.linesOfCode"), value: metrics.lines },
    { icon: FunctionSquare, label: t("analysis.functions"), value: metrics.functions },
    { icon: Activity, label: t("analysis.complexity"), value: metrics.cyclomaticComplexity },
    { icon: ShieldAlert, label: t("analysis.memoryRisk"), value: metrics.memoryLeakRisk ? t("common.yes") : t("common.no") },
    { icon: GitBranch, label: "If/Else", value: metrics.ifStatements },
    { icon: GitBranch, label: "Loops", value: metrics.loops },
    { icon: Braces, label: "Arrays", value: metrics.arrays },
    { icon: Sigma, label: "Pointers", value: metrics.pointers },
    { icon: FileType, label: "Struct", value: metrics.structs },
    { icon: MessageSquare, label: "Comments", value: metrics.comments },
    { icon: Package, label: "malloc/free", value: `${metrics.mallocCalls}/${metrics.freeCalls}` },
    { icon: Package, label: "#include", value: metrics.includes },
  ]

  const handleExportReport = () => {
    const reportHtml = `
<!DOCTYPE html>
<html lang="sr">
<head>
  <meta charset="UTF-8">
  <title>${t("analysis.title")} - C Visual Static Analyzer</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 40px; color: #0f172a; background: #f8fafc; line-height: 1.5; }
    h1 { color: #0f172a; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 4px; }
    .subtitle { color: #64748b; font-size: 14px; margin-bottom: 24px; }
    .section { margin-top: 24px; background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; margin-top: 12px; }
    .card { background: #f1f5f9; padding: 12px; border-radius: 6px; }
    .card-value { font-size: 20px; font-weight: bold; color: #0284c7; }
    .card-label { font-size: 12px; color: #64748b; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    th { background: #f1f5f9; color: #475569; }
    .badge { padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .badge-error { background: #fee2e2; color: #991b1b; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-style { background: #e0f2fe; color: #075985; }
  </style>
</head>
<body>
  <h1>📊 ${t("analysis.title")}</h1>
  <div class="subtitle">C Visual Static Analyzer | ${new Date().toLocaleString()}</div>

  <div class="section">
    <h2>📈 ${t("analysis.metricsTitle")}</h2>
    <div class="grid">
      <div class="card"><div class="card-value">${metrics.lines}</div><div class="card-label">${t("analysis.linesOfCode")}</div></div>
      <div class="card"><div class="card-value">${metrics.functions}</div><div class="card-label">${t("analysis.functions")}</div></div>
      <div class="card"><div class="card-value">${metrics.cyclomaticComplexity}</div><div class="card-label">${t("analysis.complexity")}</div></div>
      <div class="card"><div class="card-value">${metrics.mallocCalls} / ${metrics.freeCalls}</div><div class="card-label">malloc / free</div></div>
      <div class="card"><div class="card-value">${metrics.pointers}</div><div class="card-label">Pointers</div></div>
      <div class="card"><div class="card-value">${metrics.memoryLeakRisk ? t("common.yes") : t("common.no")}</div><div class="card-label">${t("analysis.memoryRisk")}</div></div>
    </div>
  </div>

  <div class="section">
    <h2>🔍 ${t("analysis.issuesTitle")} (${combinedIssues.length})</h2>
    ${combinedIssues.length === 0 ? `<p style="color:#16a34a; font-weight:600; font-size: 15px;">✅ ${t("analysis.noIssues")}</p>` : `
    <table>
      <thead>
        <tr>
          <th>Source</th>
          <th>Line</th>
          <th>Type</th>
          <th>Message</th>
        </tr>
      </thead>
      <tbody>
        ${combinedIssues.map(i => `
          <tr>
            <td><strong>${i.source.toUpperCase()}</strong></td>
            <td>${i.line}</td>
            <td><span class="badge badge-${i.severity || 'error'}">${i.severity}</span></td>
            <td>${i.message}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    `}
  </div>
</body>
</html>
    `
    const blob = new Blob([reportHtml], { type: 'text/html;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `static_analysis_report_${Date.now()}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {/* Metrike section */}
          <Collapsible open={metricsOpen} onOpenChange={setMetricsOpen}>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 flex-1">
                {metricsOpen ? <ChevronDown className="h-3.5 w-3.5 -rotate-90 transition-transform" /> : <ChevronRight className="h-3.5 w-3.5 transition-transform" />}
                {t("analysis.metricsTitle")}
              </CollapsibleTrigger>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                onClick={handleExportReport}
                title={t("analysis.exportReport")}
              >
                <Download className="h-3 w-3 text-cyan-400" />
                <span>{t("analysis.exportReport")}</span>
              </Button>
            </div>
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
              {t("analysis.issuesTitle")}
              {combinedIssues.length > 0 && (
                <span className="text-muted-foreground/60 font-normal">
                  ({t("analysis.summary", { count: combinedIssues.length })})
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
                  <p className="text-sm font-medium text-muted-foreground">{t("analysis.noIssues")}</p>
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
                                  {t("statusBar.line")} {issue.line}
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
                                <span>{t("analysis.explainWithAi")}</span>
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

