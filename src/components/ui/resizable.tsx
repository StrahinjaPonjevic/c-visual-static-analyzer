import { GripVertical } from "lucide-react"
import { Group, Panel, Separator } from "react-resizable-panels"
import { cn } from "@/lib/utils"

function ResizablePanelGroup({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof Group>) {
  return (
    <Group
      orientation={orientation}
      className={cn(
        "flex h-full w-full",
        orientation === "vertical" && "flex-col",
        className
      )}
      {...props}
    />
  )
}

const ResizablePanel = Panel

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean
}) {
  return (
    <Separator
      className={cn(
        "relative flex items-center justify-center bg-border",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
          <GripVertical className="h-2.5 w-2.5" />
        </div>
      )}
    </Separator>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
