import {
  FilePlus,
  FolderOpen,
  Save,
  Settings,
  Bot,
  BarChart3,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface ToolbarProps {
  onNew: () => void
  onOpen: () => void
  onSave: () => void
  showSidePanel: boolean
  activeSideTab: "ai" | "analysis"
  onToggleAI: () => void
  onToggleAnalysis: () => void
}

export function Toolbar({
  onNew,
  onOpen,
  onSave,
  showSidePanel,
  activeSideTab,
  onToggleAI,
  onToggleAnalysis,
}: ToolbarProps) {
  return (
    <div className="flex h-10 items-center border-b bg-secondary px-2 gap-1">
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-muted/80 hover:text-foreground transition-all duration-150"
              onClick={onNew}
            >
              <FilePlus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Novi fajl</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-muted/80 hover:text-foreground transition-all duration-150"
              onClick={onOpen}
            >
              <FolderOpen className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Otvori fajl</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-muted/80 hover:text-foreground transition-all duration-150"
              onClick={onSave}
            >
              <Save className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Snimi (Ctrl+S)</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <div className="flex-1" />

      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-lg hover:bg-muted/80 hover:text-foreground transition-all duration-150",
                showSidePanel && activeSideTab === "ai" && "!bg-primary/20 !text-primary hover:!bg-primary/30"
              )}
              onClick={onToggleAI}
            >
              <Bot className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>AI Asistent</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-lg hover:bg-muted/80 hover:text-foreground transition-all duration-150",
                showSidePanel && activeSideTab === "analysis" && "!bg-amber-500/20 !text-amber-400 hover:!bg-amber-500/30"
              )}
              onClick={onToggleAnalysis}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Statistička Analiza</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-muted/80 hover:text-foreground transition-all duration-150"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Podešavanja</TooltipContent>
      </Tooltip>
    </div>
  )
}
