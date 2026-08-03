import { FileCode, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { useTranslation } from "@/i18n/LanguageContext"

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
  const { t } = useTranslation()
  const fileName = filePath ? filePath.split(/[/\\]/).pop() : null

  return (
    <div className="flex h-7 items-center justify-between border-t bg-secondary px-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-3">
        {gccDetected === undefined ? (
          <div className="flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            <span>GCC ({t("common.checking")})</span>
          </div>
        ) : gccDetected ? (
          <div
            className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors"
            title={`${gccVersion ?? ''}`}
            onClick={onOpenDependencyDialog}
          >
            <CheckCircle className="h-3 w-3 text-emerald-400" />
            <span>GCC {gccVersion ?? ""}</span>
          </div>
        ) : (
          <div
            className="flex items-center gap-1.5 cursor-pointer hover:text-red-300 font-medium transition-colors"
            onClick={onOpenDependencyDialog}
          >
            <XCircle className="h-3 w-3 text-red-400" />
            <span className="text-red-400">GCC ({t("dialogs.dependency.notInstalled")})</span>
          </div>
        )}
        {cppcheckDetected === undefined ? (
          <div className="flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            <span>Cppcheck ({t("common.checking")})</span>
          </div>
        ) : cppcheckDetected ? (
          <div
            className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors"
            title={`${cppcheckVersion ?? ''}`}
            onClick={onOpenDependencyDialog}
          >
            <CheckCircle className="h-3 w-3 text-emerald-400" />
            <span>Cppcheck {cppcheckVersion ?? ""}</span>
          </div>
        ) : (
          <div
            className="flex items-center gap-1.5 cursor-pointer hover:text-red-300 font-medium transition-colors"
            onClick={onOpenDependencyDialog}
          >
            <XCircle className="h-3 w-3 text-red-400" />
            <span className="text-red-400">Cppcheck ({t("dialogs.dependency.notInstalled")})</span>
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
        <span>{t("statusBar.line")} {line}, {t("statusBar.col")} {column}</span>
        <span>{language}</span>
        <span>UTF-8</span>
      </div>
    </div>
  )
}

