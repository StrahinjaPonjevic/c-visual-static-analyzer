import { AIPanel } from "@/components/AIPanel"
import { StaticAnalysisPanel } from "@/components/StaticAnalysisPanel"

interface SidePanelProps {
  activeTab: "ai" | "analysis"
  code: string
}

export function SidePanel({ activeTab, code }: SidePanelProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden">
        {activeTab === "ai" ? <AIPanel /> : <StaticAnalysisPanel code={code} />}
      </div>
    </div>
  )
}
