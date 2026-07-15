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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface CodeMetrics {
  lines: number
  functions: number
  cyclomaticComplexity: number
  comments: number
  includes: number
}

interface CppcheckIssue {
  id: number
  severity: "error" | "warning" | "style" | "performance"
  line: number
  message: string
}

interface StaticAnalysisPanelProps {
  code: string
}

export function StaticAnalysisPanel({ code }: StaticAnalysisPanelProps) {
  const [metrics, setMetrics] = useState<CodeMetrics>({
    lines: 0,
    functions: 0,
    cyclomaticComplexity: 0,
    comments: 0,
    includes: 0,
  })
  const [issues, setIssues] = useState<CppcheckIssue[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const analyzeCode = useCallback(() => {
    setIsAnalyzing(true)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      const lines = code.split("\n")
      const lineCount = lines.filter((l) => l.trim().length > 0).length

      const functionCount = (
        code.match(
          /\b(void|int|char|float|double|long|short|unsigned|signed|static|extern|const)\s+\w+\s*\(/g
        ) || []
      ).length

      const complexityKeywords =
        /\b(if|else\s+if|for|while|do|case|catch)\b|&&|\|\|/g
      const complexityMatches = code.match(complexityKeywords) || []
      const cyclomaticComplexity = 1 + complexityMatches.length

      const singleLineComments = (code.match(/\/\/.*$/gm) || []).length
      const multiLineComments = (code.match(/\/\*[\s\S]*?\*\//g) || []).length
      const comments = singleLineComments + multiLineComments

      const includes = (code.match(/#include\s*[<"]/g) || []).length

      setMetrics({
        lines: lineCount,
        functions: functionCount,
        cyclomaticComplexity,
        comments,
        includes,
      })

      const detectedIssues: CppcheckIssue[] = []
      let issueId = 1

      lines.forEach((line, index) => {
        const lineNum = index + 1

        if (/\bgets\b/.test(line)) {
          detectedIssues.push({
            id: issueId++,
            severity: "error",
            line: lineNum,
            message: "Unsafe function 'gets()' - potential buffer overflow",
          })
        }

        if (/\bprintf\s*\(\s*[^"']/.test(line) && !/fprintf|sprintf/.test(line)) {
          detectedIssues.push({
            id: issueId++,
            severity: "warning",
            line: lineNum,
            message: "Possible format string vulnerability",
          })
        }

        const prevLines = lines.slice(Math.max(0, index - 3), index).join(" ")
        if (/=\s*malloc\s*\(/.test(line) && !/if\s*\([^)]*\b\w+\b/.test(prevLines)) {
          detectedIssues.push({
            id: issueId++,
            severity: "warning",
            line: lineNum,
            message: "malloc() return value not checked for NULL",
          })
        }

        if (/\/\//.test(line) && /TODO|FIXME|HACK|XXX/.test(line)) {
          detectedIssues.push({
            id: issueId++,
            severity: "style",
            line: lineNum,
            message: "Unresolved TODO/FIXME comment",
          })
        }
      })

      setIssues(detectedIssues)
      setIsAnalyzing(false)
    }, 500)
  }, [code])

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
    }
  }

  function getSeverityIcon(severity: CppcheckIssue["severity"]) {
    switch (severity) {
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-400" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-400" />
      case "style":
        return <CheckCircle className="h-4 w-4 text-blue-400" />
      case "performance":
        return <CheckCircle className="h-4 w-4 text-purple-400" />
    }
  }

  const errorCount = issues.filter((i) => i.severity === "error").length
  const warningCount = issues.filter((i) => i.severity === "warning").length

  return (
    <div className="flex h-full flex-col bg-sidebar overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <FileCode className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">Statistička Analiza</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={analyzeCode}
          disabled={isAnalyzing}
        >
          <RefreshCw
            className={`h-4 w-4 ${isAnalyzing ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              Metrike Koda
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 rounded-md bg-muted p-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">{metrics.lines}</div>
                  <div className="text-xs text-muted-foreground">Linija</div>
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
                  <div className="text-sm font-medium">
                    {metrics.cyclomaticComplexity}
                  </div>
                  <div className="text-xs text-muted-foreground">Složenost</div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-muted p-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">{metrics.comments}</div>
                  <div className="text-xs text-muted-foreground">Komentara</div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-muted p-2 col-span-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">{metrics.includes}</div>
                  <div className="text-xs text-muted-foreground">
                    #include direktiva
                  </div>
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

            {issues.length === 0 ? (
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
                {issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="flex items-start gap-2 rounded-md border p-2 text-sm"
                  >
                    {getSeverityIcon(issue.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Linija {issue.line}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getSeverityColor(issue.severity)}`}
                        >
                          {issue.severity}
                        </Badge>
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
