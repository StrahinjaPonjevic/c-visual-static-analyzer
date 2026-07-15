import { Terminal, AlertTriangle, FileOutput } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"

export function OutputPanel() {
  return (
    <Tabs defaultValue="terminal" className="h-full flex flex-col">
      <TabsList className="h-9 rounded-none border-b px-2 justify-start gap-1 bg-transparent">
        <TabsTrigger
          value="terminal"
          className="h-7 rounded-sm px-2 text-xs data-[state=active]:bg-muted"
        >
          <Terminal className="h-3.5 w-3.5 mr-1.5" />
          Terminal
        </TabsTrigger>
        <TabsTrigger
          value="problems"
          className="h-7 rounded-sm px-2 text-xs data-[state=active]:bg-muted"
        >
          <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
          Problemi
        </TabsTrigger>
        <TabsTrigger
          value="output"
          className="h-7 rounded-sm px-2 text-xs data-[state=active]:bg-muted"
        >
          <FileOutput className="h-3.5 w-3.5 mr-1.5" />
          Output
        </TabsTrigger>
      </TabsList>

      <TabsContent value="terminal" className="flex-1 mt-0 p-0">
        <ScrollArea className="h-full">
          <div className="p-3 font-mono text-xs text-muted-foreground">
            <p className="text-emerald-400">$ Kliknite "Pokreni" za kompajliranje...</p>
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="problems" className="flex-1 mt-0 p-0">
        <ScrollArea className="h-full">
          <div className="p-3 text-xs text-muted-foreground">
            <p>Nema pronađenih problema.</p>
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="output" className="flex-1 mt-0 p-0">
        <ScrollArea className="h-full">
          <div className="p-3 font-mono text-xs text-muted-foreground">
            <p>Čekam na akciju...</p>
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  )
}
