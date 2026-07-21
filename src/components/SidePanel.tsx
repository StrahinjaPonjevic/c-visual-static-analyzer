import { AIPanel } from "@/components/AIPanel"
import { StaticAnalysisPanel } from "@/components/StaticAnalysisPanel"
import type { CppcheckIssue } from "@/types"

interface SidePanelProps {
  activeTab: "ai" | "analysis"
  code: string
  onIssuesChange?: (issues: CppcheckIssue[]) => void
}

export function SidePanel({ activeTab, code, onIssuesChange }: SidePanelProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-sidebar">
      {activeTab === "ai" ? <AIPanel /> : <StaticAnalysisPanel code={code} onIssuesChange={onIssuesChange} />}
    </div>
  )
}
