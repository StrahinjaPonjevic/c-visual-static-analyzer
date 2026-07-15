import { FileCode, CheckCircle } from "lucide-react"

interface StatusBarProps {
  filePath: string | null
  line?: number
  column?: number
  language?: string
}

export function StatusBar({ filePath, line = 1, column = 1, language = "C" }: StatusBarProps) {
  const fileName = filePath ? filePath.split(/[/\\]/).pop() : null

  return (
    <div className="flex h-7 items-center justify-between border-t bg-secondary px-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <CheckCircle className="h-3 w-3 text-emerald-400" />
          <span>Spremno</span>
        </div>
        {fileName && (
          <div className="flex items-center gap-1.5">
            <FileCode className="h-3 w-3" />
            <span>{fileName}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <span>Ln {line}, Col {column}</span>
        <span>{language}</span>
        <span>UTF-8</span>
      </div>
    </div>
  )
}
