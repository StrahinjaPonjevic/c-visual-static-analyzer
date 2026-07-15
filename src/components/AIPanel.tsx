import { useState, useRef } from "react"
import { Send, Bot, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface Message {
  id: number
  role: "user" | "assistant"
  content: string
}

export function AIPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      content: "Zdravo! Ja sam vaš AI asistent za programiranje. Mogu vam pomoći sa objašnjavanjem koda, pronalaženjem grešaka i učenjem C programiranja. Kako mogu da pomognem?",
    },
  ])
  const [input, setInput] = useState("")
  const messageIdRef = useRef(2)

  function handleSend() {
    if (!input.trim()) return

    const userMessage: Message = {
      id: messageIdRef.current++,
      role: "user",
      content: input,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")

    setTimeout(() => {
      const assistantMessage: Message = {
        id: messageIdRef.current++,
        role: "assistant",
        content: "Hvala na pitanju! Obradiću vaš zahtev u najkraćem mogućem roku. AI asistent će uskoro biti u potpunosti funkcionalan.",
      }
      setMessages((prev) => [...prev, assistantMessage])
    }, 1000)
  }

  return (
    <div className="flex h-full flex-col bg-sidebar overflow-hidden">
      <div className="flex items-center gap-2 border-b px-4 py-3 shrink-0">
        <Bot className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm">AI Asistent</span>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : ""
              }`}
            >
              {message.role === "assistant" && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary/10">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`rounded-lg px-3 py-2 text-sm max-w-[85%] ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {message.content}
              </div>
              {message.role === "user" && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary/10">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pitajte nešto o kodu..."
            className="h-9 text-sm"
          />
          <Button type="submit" size="icon" className="h-9 w-9 shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
