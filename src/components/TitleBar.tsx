import { useState, useEffect } from "react"
import { Minus, Square, X, Copy } from "lucide-react"

interface TitleBarProps {
  filePath: string | null
  onClose?: () => void
  isDirty?: boolean
}

export function TitleBar({ filePath, onClose, isDirty }: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false)
  const fileName = filePath ? filePath.split(/[/\\]/).slice(-2).join('\\') : null

  useEffect(() => {
    const cleanup = window.api.onWindowStateChanged((maximized) => {
      setIsMaximized(maximized)
    })
    return cleanup
  }, [])

  return (
    <div className="flex h-8 items-center justify-between bg-secondary select-none">
      <div
        className="flex items-center gap-2 px-3"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <span className="text-xs font-bold text-muted-foreground">
          C Visual Static Analyzer
        </span>
      </div>

      <div
        className="flex-1 flex items-center justify-center"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          {fileName || 'Novi fajl'}
          {isDirty && (
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
          )}
        </span>
      </div>

      <div
        className="flex h-full items-center gap-1 pr-2"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <button
          className="flex h-7 w-7 items-center justify-center rounded-full border border-muted-foreground/30 text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-150"
          onClick={() => window.api.minimizeWindow()}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-full border border-muted-foreground/30 text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-150"
          onClick={() => window.api.maximizeWindow()}
        >
          {isMaximized ? (
            <Copy className="h-3 w-3" />
          ) : (
            <Square className="h-3 w-3" />
          )}
        </button>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-full border border-muted-foreground/30 text-muted-foreground hover:bg-red-500/80 hover:text-white hover:border-red-500/80 transition-all duration-150"
          onClick={() => onClose?.()}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
