import {
  FilePlus,
  FolderOpen,
  FolderTree,
  Save,
  Settings,
  Bot,
  BarChart3,
  Play,
  Square,
  Loader2,
  X,
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
  onOpenFolder: () => void
  onCloseProject?: () => void
  onSave: () => void
  showSidePanel: boolean
  activeSideTab: "ai" | "analysis"
  onToggleAI: () => void
  onToggleAnalysis: () => void
  showExplorer: boolean
  onToggleExplorer: () => void
  onRun: () => void
  onStop: () => void
  isRunning: boolean
  isCompiling: boolean
  onSettings: () => void
  mode: 'single' | 'project'
  projectName?: string | null
}

export function Toolbar({
  onNew,
  onOpen,
  onOpenFolder,
  onCloseProject,
  onSave,
  showSidePanel,
  activeSideTab,
  onToggleAI,
  onToggleAnalysis,
  showExplorer,
  onToggleExplorer,
  onRun,
  onStop,
  isRunning,
  isCompiling,
  onSettings,
  mode,
  projectName,
}: ToolbarProps) {
  return (
    <div className="flex h-10 items-center border-b bg-secondary px-2 gap-1">
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-lg hover:bg-muted/80 hover:text-foreground transition-all duration-150",
                showExplorer && "!bg-primary/20 !text-primary"
              )}
              onClick={onToggleExplorer}
            >
              <FolderTree className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>File Explorer ({mode === 'project' ? 'Projekat' : 'Pojedinačni fajl'})</TooltipContent>
        </Tooltip>

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

        {mode === 'project' ? (
          <div className="flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 text-amber-400 px-2 py-1 rounded-md text-xs font-medium">
            <FolderOpen className="h-3.5 w-3.5" />
            <span className="max-w-[120px] truncate">{projectName || "Projekat"}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onCloseProject}
                  className="ml-1 rounded p-0.5 hover:bg-amber-500/30 text-amber-300 hover:text-white transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Zatvori projekat (Ctrl+Shift+W)</TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2.5 rounded-lg hover:bg-muted/80 hover:text-foreground transition-all duration-150 text-xs font-medium"
                onClick={onOpenFolder}
              >
                <FolderOpen className="h-4 w-4 text-amber-400" />
                <span>Otvori Projekat</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Otvori projekat / folder (Ctrl+Shift+O)</TooltipContent>
          </Tooltip>
        )}

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

      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isRunning ? "destructive" : "default"}
              size="sm"
              className={cn(
                "h-8 gap-1.5 px-3 rounded-lg transition-all duration-200 active:scale-95",
                isCompiling && "pointer-events-none"
              )}
              onClick={isRunning ? onStop : onRun}
              disabled={isCompiling}
            >
              {isCompiling ? (
                <Loader2 className="h-4 w-4 animate-spin transition-opacity" />
              ) : isRunning ? (
                <Square className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              <span className="text-xs font-medium transition-opacity">
                {isCompiling ? "Kompajliranje..." : isRunning ? "Zaustavi" : "Pokreni"}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isCompiling ? "Kompajliranje..." : isRunning ? "Zaustavi program" : "Kompajliraj i pokreni"}
          </TooltipContent>
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
            type="button"
            className="h-8 w-8 rounded-lg hover:bg-muted/80 hover:text-foreground transition-all duration-150"
            onClick={onSettings}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Podešavanja</TooltipContent>
      </Tooltip>
    </div>
  )
}
