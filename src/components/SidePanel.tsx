import { AIPanel } from "@/components/AIPanel"
import { StaticAnalysisPanel, type ExplainWithAiItem } from "@/components/StaticAnalysisPanel"
import type { CppcheckIssue, GccError } from "@/types"
import type { Message } from "@/App"
import { cn } from "@/lib/utils"

interface SidePanelProps {
  activeTab: "ai" | "analysis"
  code: string
  cppcheckIssues: CppcheckIssue[]
  gccErrors?: GccError[]
  isAnalyzing: boolean
  onRefreshCppcheck: () => void
  messages: Message[]
  aiInput: string
  onAiInputChange: (value: string) => void
  isAiLoading: boolean
  aiError: string | null
  onAiSend: () => void
  onAiStop: () => void
  onAiClear: () => void
  onSelectFile?: (filePath: string, line?: number) => void
  onExplainWithAi?: (item: ExplainWithAiItem) => void
  onApplyCode?: (code: string) => void
}

export function SidePanel({
  activeTab,
  code,
  cppcheckIssues,
  gccErrors = [],
  isAnalyzing,
  onRefreshCppcheck,
  messages,
  aiInput,
  onAiInputChange,
  isAiLoading,
  aiError,
  onAiSend,
  onAiStop,
  onAiClear,
  onSelectFile,
  onExplainWithAi,
  onApplyCode,
}: SidePanelProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-sidebar">
      <div className={cn("flex h-full flex-col overflow-hidden", activeTab !== "ai" && "hidden")}>
        <AIPanel
          code={code}
          messages={messages}
          input={aiInput}
          onInputChange={onAiInputChange}
          isLoading={isAiLoading}
          error={aiError}
          onSend={onAiSend}
          onStop={onAiStop}
          onClear={onAiClear}
          onApplyCode={onApplyCode}
        />
      </div>
      <div className={cn("flex h-full flex-col overflow-hidden", activeTab !== "analysis" && "hidden")}>
        <StaticAnalysisPanel
          code={code}
          cppcheckIssues={cppcheckIssues}
          gccErrors={gccErrors}
          isAnalyzing={isAnalyzing}
          onRefreshCppcheck={onRefreshCppcheck}
          onSelectFile={onSelectFile}
          onExplainWithAi={onExplainWithAi}
        />
      </div>
    </div>
  )
}

