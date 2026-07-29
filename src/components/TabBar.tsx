import { FileCode, FileText, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface TabBarProps {
  openFilePaths: string[]
  activeFilePath: string | null
  dirtyFiles: Set<string>
  onSelectTab: (filePath: string) => void
  onCloseTab: (filePath: string) => void
}

function getFileName(filePath: string): string {
  const parts = filePath.split(/[/\\]/)
  return parts[parts.length - 1] || filePath
}

export function TabBar({
  openFilePaths,
  activeFilePath,
  dirtyFiles,
  onSelectTab,
  onCloseTab,
}: TabBarProps) {
  if (openFilePaths.length === 0) return null

  return (
    <div className="flex h-9 w-full items-center bg-muted/40 border-b overflow-x-auto select-none no-scrollbar">
      {openFilePaths.map((filePath) => {
        const isActive = filePath === activeFilePath
        const isDirty = dirtyFiles.has(filePath)
        const fileName = getFileName(filePath)
        const isHeader = fileName.endsWith('.h') || fileName.endsWith('.hpp')

        return (
          <div
            key={filePath}
            className={cn(
              "group relative flex h-full items-center gap-1.5 px-3 border-r text-xs cursor-pointer transition-colors duration-150 border-border/40 min-w-[120px] max-w-[200px]",
              isActive
                ? "bg-background font-medium text-foreground border-b-2 border-b-primary"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
            onClick={() => onSelectTab(filePath)}
            title={filePath}
          >
            {isHeader ? (
              <FileText className="h-3.5 w-3.5 text-purple-400 shrink-0" />
            ) : (
              <FileCode className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            )}
            <span className="truncate flex-1">{fileName}</span>
            {isDirty && (
              <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" title="Nesnimljene izmene" />
            )}
            <button
              type="button"
              className={cn(
                "h-4 w-4 rounded-sm flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity",
                isDirty && "opacity-100"
              )}
              onClick={(e) => {
                e.stopPropagation()
                onCloseTab(filePath)
              }}
              title="Zatvori tab"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
