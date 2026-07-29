import { AIPanel } from "@/components/AIPanel"
import { StaticAnalysisPanel } from "@/components/StaticAnalysisPanel"
import type { CppcheckIssue } from "@/types"
import type { Message } from "@/App"
import { cn } from "@/lib/utils"

interface SidePanelProps {
  activeTab: "ai" | "analysis"
  code: string
  cppcheckIssues: CppcheckIssue[]
  isAnalyzing: boolean
  onRefreshCppcheck: () => void
  messages: Message[]
  aiInput: string
  onAiInputChange: (value: string) => void
  isAiLoading: boolean
  aiError: string | null
  onAiSend: () => void
  onAiStop: () => void
  onSelectFile?: (filePath: string, line?: number) => void
}

export function SidePanel({
  activeTab,
  code,
  cppcheckIssues,
  isAnalyzing,
  onRefreshCppcheck,
  messages,
  aiInput,
  onAiInputChange,
  isAiLoading,
  aiError,
  onAiSend,
  onAiStop,
  onSelectFile,
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
        />
      </div>
      <div className={cn("flex h-full flex-col overflow-hidden", activeTab !== "analysis" && "hidden")}>
        <StaticAnalysisPanel
          code={code}
          cppcheckIssues={cppcheckIssues}
          isAnalyzing={isAnalyzing}
          onRefreshCppcheck={onRefreshCppcheck}
          onSelectFile={onSelectFile}
        />
      </div>
    </div>
  )
}
