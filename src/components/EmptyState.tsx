import { FilePlus, FolderOpen, FolderTree, Code2, Terminal } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  onNew: () => void
  onOpen: () => void
  onOpenFolder: () => void
}

export function EmptyState({ onNew, onOpen, onOpenFolder }: EmptyStateProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-background p-4 sm:p-6 text-center select-none overflow-y-auto min-h-0">
      <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-3 sm:mb-4 shadow-sm shrink-0">
        <Code2 className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
      </div>

      <h2 className="text-lg sm:text-xl font-bold text-foreground mb-1">
        C Visual Static Analyzer
      </h2>
      <p className="text-xs text-muted-foreground max-w-md mb-5 sm:mb-6 leading-relaxed px-2">
        Nema otvorenih fajlova. Otvorite postojeći C fajl, projekat ili kreirajte novi fajl da biste započeli rad i analizu koda.
      </p>

      {/* Quick Action Buttons */}
      <div className="flex items-center gap-2.5 sm:gap-3 mb-6 sm:mb-8 flex-wrap justify-center max-w-md">
        <Button
          onClick={onNew}
          className="gap-2 text-xs font-medium px-4 h-9 shadow-sm"
        >
          <FilePlus className="h-4 w-4" />
          Novi fajl
        </Button>
        <Button
          variant="outline"
          onClick={onOpen}
          className="gap-2 text-xs font-medium px-4 h-9 border-border/80 hover:bg-muted"
        >
          <FolderOpen className="h-4 w-4 text-blue-400" />
          Otvori fajl
        </Button>
        <Button
          variant="outline"
          onClick={onOpenFolder}
          className="gap-2 text-xs font-medium px-4 h-9 border-border/80 hover:bg-muted"
        >
          <FolderTree className="h-4 w-4 text-amber-400" />
          Otvori projekat
        </Button>
      </div>

      {/* Shortcuts Guide */}
      <div className="rounded-xl border bg-card/50 p-3.5 sm:p-4 max-w-sm w-full text-left space-y-2 sm:space-y-2.5 shadow-none">
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Terminal className="h-3.5 w-3.5 text-primary" />
          Tastaturne prečice
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Novi fajl</span>
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] border text-foreground">Ctrl + N</kbd>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Otvori fajl</span>
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] border text-foreground">Ctrl + O</kbd>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Otvori projekat</span>
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] border text-foreground">Ctrl + Shift + O</kbd>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Kompajliraj i pokreni</span>
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] border text-foreground">F5 / Ctrl + R</kbd>
        </div>
      </div>
    </div>
  )
}
