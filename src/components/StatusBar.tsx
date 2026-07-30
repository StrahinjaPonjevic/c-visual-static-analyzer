import { FileCode, CheckCircle, XCircle, Loader2 } from "lucide-react"

interface StatusBarProps {
  filePath: string | null
  line?: number
  column?: number
  language?: string
  gccDetected?: boolean
  gccVersion?: string
  cppcheckDetected?: boolean
  cppcheckVersion?: string
  onOpenDependencyDialog?: () => void
}

export function StatusBar({
  filePath,
  line = 1,
  column = 1,
  language = "C",
  gccDetected,
  gccVersion,
  cppcheckDetected,
  cppcheckVersion,
  onOpenDependencyDialog,
}: StatusBarProps) {
  const fileName = filePath ? filePath.split(/[/\\]/).pop() : null

  return (
    <div className="flex h-7 items-center justify-between border-t bg-secondary px-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-3">
        {gccDetected === undefined ? (
          <div className="flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            <span>Proveravam GCC...</span>
          </div>
        ) : gccDetected ? (
          <div
            className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors"
            title={`${gccVersion ?? ''} (Kliknite za detalje o zavisnostima)`}
            onClick={onOpenDependencyDialog}
          >
            <CheckCircle className="h-3 w-3 text-emerald-400" />
            <span>GCC {gccVersion ?? ""}</span>
          </div>
        ) : (
          <div
            className="flex items-center gap-1.5 cursor-pointer hover:text-red-300 font-medium transition-colors"
            title="GCC nije instaliran. Kliknite za instrukcije za instalaciju."
            onClick={onOpenDependencyDialog}
          >
            <XCircle className="h-3 w-3 text-red-400" />
            <span className="text-red-400">GCC nije instaliran</span>
          </div>
        )}
        {cppcheckDetected === undefined ? (
          <div className="flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            <span>Proveravam Cppcheck...</span>
          </div>
        ) : cppcheckDetected ? (
          <div
            className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors"
            title={`${cppcheckVersion ?? ''} (Kliknite za detalje o zavisnostima)`}
            onClick={onOpenDependencyDialog}
          >
            <CheckCircle className="h-3 w-3 text-emerald-400" />
            <span>Cppcheck {cppcheckVersion ?? ""}</span>
          </div>
        ) : (
          <div
            className="flex items-center gap-1.5 cursor-pointer hover:text-red-300 font-medium transition-colors"
            title="Cppcheck nije instaliran. Kliknite za instrukcije za instalaciju."
            onClick={onOpenDependencyDialog}
          >
            <XCircle className="h-3 w-3 text-red-400" />
            <span className="text-red-400">Cppcheck nije instaliran</span>
          </div>
        )}
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

