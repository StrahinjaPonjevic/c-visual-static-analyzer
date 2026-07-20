import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileWarning } from "lucide-react"

interface UnsavedChangesDialogProps {
  open: boolean
  fileName: string | null
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
}

export function UnsavedChangesDialog({
  open,
  fileName,
  onSave,
  onDiscard,
  onCancel,
}: UnsavedChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
              <FileWarning className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <DialogTitle>Nesačuvane promene</DialogTitle>
              <DialogDescription>
                {fileName
                  ? `Fajl "${fileName}" ima nesačuvane promene.`
                  : "Trenutni fajl ima nesačuvane promene."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            Odustani
          </Button>
          <Button variant="secondary" onClick={onDiscard}>
            Ne sačuvaj
          </Button>
          <Button variant="default" onClick={onSave}>
            Sačuvaj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
