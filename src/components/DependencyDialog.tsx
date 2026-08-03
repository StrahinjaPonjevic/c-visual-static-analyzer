import { CheckCircle2, XCircle, Terminal, HelpCircle, RefreshCw } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTranslation } from "@/i18n/LanguageContext"

interface DependencyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  gccDetected?: boolean
  gccVersion?: string
  cppcheckDetected?: boolean
  cppcheckVersion?: string
  onRecheck?: () => void
}

export function DependencyDialog({
  open,
  onOpenChange,
  gccDetected,
  gccVersion,
  cppcheckDetected,
  cppcheckVersion,
  onRecheck,
}: DependencyDialogProps) {
  const { t } = useTranslation()
  const missingCount = (gccDetected === false ? 1 : 0) + (cppcheckDetected === false ? 1 : 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Terminal className="h-5 w-5 text-primary" />
            {t("dialogs.dependency.title")}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t("dialogs.dependency.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Status cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* GCC status */}
            <div className={`p-3 rounded-lg border flex flex-col gap-1.5 ${gccDetected ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs flex items-center gap-1.5">
                  {gccDetected ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  {t("dialogs.dependency.gccTitle")}
                </span>
                <Badge variant={gccDetected ? "secondary" : "destructive"} className="text-[10px] px-1.5 py-0 h-4">
                  {gccDetected ? t("dialogs.dependency.installed") : t("dialogs.dependency.notInstalled")}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                {gccDetected ? (gccVersion || t("dialogs.dependency.installed")) : t("dialogs.dependency.notInstalled")}
              </p>
            </div>

            {/* Cppcheck status */}
            <div className={`p-3 rounded-lg border flex flex-col gap-1.5 ${cppcheckDetected ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs flex items-center gap-1.5">
                  {cppcheckDetected ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  {t("dialogs.dependency.cppcheckTitle")}
                </span>
                <Badge variant={cppcheckDetected ? "secondary" : "destructive"} className="text-[10px] px-1.5 py-0 h-4">
                  {cppcheckDetected ? t("dialogs.dependency.installed") : t("dialogs.dependency.notInstalled")}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                {cppcheckDetected ? (cppcheckVersion || t("dialogs.dependency.installed")) : t("dialogs.dependency.notInstalled")}
              </p>
            </div>
          </div>

          {/* Installation guide if missing */}
          {missingCount > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-amber-400">
                <HelpCircle className="h-4 w-4" />
                <span>Instrukcije za instalaciju:</span>
              </div>

              <div className="space-y-2 text-muted-foreground pl-1">
                <div>
                  <div className="font-semibold text-foreground mb-0.5">Ubuntu / Debian (Linux):</div>
                  <code className="block rounded bg-background px-2 py-1 font-mono text-[11px] text-primary border select-all">
                    sudo apt update && sudo apt install build-essential cppcheck
                  </code>
                </div>

                <div>
                  <div className="font-semibold text-foreground mb-0.5">Fedora / RHEL (Linux):</div>
                  <code className="block rounded bg-background px-2 py-1 font-mono text-[11px] text-primary border select-all">
                    sudo dnf install gcc cppcheck
                  </code>
                </div>

                <div>
                  <div className="font-semibold text-foreground mb-0.5">Arch Linux:</div>
                  <code className="block rounded bg-background px-2 py-1 font-mono text-[11px] text-primary border select-all">
                    sudo pacman -S gcc cppcheck
                  </code>
                </div>

                <div>
                  <div className="font-semibold text-foreground mb-0.5">Windows:</div>
                  <p className="text-[11px] leading-relaxed">
                    Instalirajte <strong className="text-foreground">MinGW-w64</strong> (preko MSYS2 ili WinLibs) i <strong className="text-foreground">Cppcheck Windows Installer</strong>, i dodajte njihove <code className="bg-background px-1 py-0.5 rounded">bin</code> foldere u PATH okruženja.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {onRecheck && (
            <Button variant="outline" size="sm" onClick={onRecheck} className="gap-1.5 text-xs">
              <RefreshCw className="h-3.5 w-3.5" />
              {t("dialogs.dependency.recheck")}
            </Button>
          )}
          <Button size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            {t("common.ok")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
