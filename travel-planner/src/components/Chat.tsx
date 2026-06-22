"use client"

import { useState, useRef, useEffect } from "react"

type Message = {
  role: "user" | "assistant"
  content: string
}

type StreamEvent =
  | { type: "text"; content: string }
  | { type: "tool_use"; tool: string; args: Record<string, unknown>; result: string }
  | { type: "done" }

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [showConfig, setShowConfig] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem("opencode_go_key")
    if (saved) setApiKey(saved)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  function saveKey(key: string) {
    setApiKey(key)
    localStorage.setItem("opencode_go_key", key)
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg: Message = { role: "user", content: input }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setLoading(true)

    const apiMessages = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: input },
    ]

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          apiKey: apiKey || undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erro ao comunicar com o servidor")
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("Resposta sem corpo")

      const assistantMsg: Message = { role: "assistant", content: "" }
      setMessages((prev) => [...prev, assistantMsg])

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const event: StreamEvent = JSON.parse(line)
            if (event.type === "text") {
              setMessages((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + event.content,
                  }
                }
                return updated
              })
            }
          } catch {
            // ignora linhas mal formatadas
          }
        }
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Erro desconhecido"
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `**Erro:** ${errorMsg}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="border-b border-white/10 px-4 py-3 flex items-center justify-between bg-white/5">
        <div>
          <h1 className="text-lg font-semibold text-white">Planejador de Viagens</h1>
          <p className="text-xs text-white/40">
            Com IA via OpenCode Go
          </p>
        </div>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="text-xs px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
        >
          {showConfig ? "Fechar" : "Configurar Chave"}
        </button>
      </header>

      {/* Config panel */}
      {showConfig && (
        <div className="border-b border-white/10 px-4 py-3 bg-white/5">
          <label className="block text-xs text-white/50 mb-1">
            Chave da API OpenCode Go
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => saveKey(e.target.value)}
              placeholder="sk-..."
              className="flex-1 px-3 py-1.5 text-sm rounded-md bg-white/10 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30"
            />
          </div>
          <p className="text-[10px] text-white/30 mt-1">
            Sua chave fica salva apenas no seu navegador. Obtenha em{" "}
            <a
              href="https://opencode.ai/auth"
              target="_blank"
              className="underline hover:text-white/50"
            >
              opencode.ai/auth
            </a>
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-white/30">
            <div className="text-5xl mb-4">✈️</div>
            <p className="text-sm">Pergunte sobre destinos, peça orçamentos</p>
            <p className="text-xs mt-1">ou peça ajuda para planejar sua próxima viagem!</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-md"
                  : "bg-white/10 text-white/90 rounded-bl-md"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/10 rounded-2xl rounded-bl-md px-4 py-2.5">
              <span className="inline-flex gap-1">
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="border-t border-white/10 px-4 py-3"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={apiKey ? "Ex: Quero viajar para a Europa em agosto..." : "Configure sua chave Go primeiro ↑"}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 text-white rounded-xl transition-colors"
          >
            {loading ? "..." : "Enviar"}
          </button>
        </div>
      </form>
    </div>
  )
}
