"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { signOut } from "next-auth/react"
import Onboarding from "./Onboarding"

type Message = { role: "user" | "assistant"; content: string }
type StreamEvent = { type: "text"; content: string } | { type: "done" }
type Plan = { id: string; title: string | null; updatedAt: string }

export default function Chat({
  userName,
  memories: initialMemories,
  plans: initialPlans,
}: {
  userName?: string
  memories?: Record<string, string>
  plans: Plan[]
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [memories, setMemories] = useState(initialMemories ?? {})
  const [showOnboarding, setShowOnboarding] = useState(
    !initialMemories || Object.keys(initialMemories).length === 0
  )
  const [showEdit, setShowEdit] = useState(false)
  const [plans, setPlans] = useState<Plan[]>(initialPlans)
  const [activePlanId, setActivePlanId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState<string | null>(null)
  const [editTitleValue, setEditTitleValue] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Load last active plan or create one
  useEffect(() => {
    if (plans.length > 0 && !activePlanId) {
      loadPlan(plans[0].id)
    } else if (plans.length === 0 && !activePlanId) {
      createPlan()
    }
  }, [plans])

  const saveMemories = useCallback(async (answers: Record<string, string>) => {
    for (const [key, value] of Object.entries(answers)) {
      if (value?.trim()) {
        await fetch("/api/memories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value }),
        })
      }
    }
    setMemories((prev) => ({ ...prev, ...answers }))
    setShowOnboarding(false)
    setShowEdit(false)
  }, [])

  async function createPlan(title?: string) {
    const res = await fetch("/api/trip-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title || "Nova viagem" }),
    })
    if (res.ok) {
      const plan = await res.json()
      setPlans((prev) => [plan, ...prev])
      setActivePlanId(plan.id)
      setMessages([])
      setSidebarOpen(false)
    }
  }

  async function loadPlan(planId: string) {
    const res = await fetch(`/api/trip-plans/${planId}`)
    if (res.ok) {
      const plan = await res.json()
      setActivePlanId(planId)
      try {
        setMessages(JSON.parse(plan.messages))
      } catch {
        setMessages([])
      }
      setSidebarOpen(false)
    }
  }

  async function saveMessages(msgs: Message[]) {
    if (!activePlanId) return
    await fetch(`/api/trip-plans/${activePlanId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: JSON.stringify(msgs) }),
    })
  }

  async function updateTitle(planId: string, title: string) {
    const res = await fetch(`/api/trip-plans/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    })
    if (res.ok) {
      setPlans((prev) =>
        prev.map((p) => (p.id === planId ? { ...p, title } : p))
      )
    }
    setEditingTitle(null)
  }

  async function deletePlan(planId: string) {
    await fetch(`/api/trip-plans/${planId}`, { method: "DELETE" })
    setPlans((prev) => prev.filter((p) => p.id !== planId))
    if (activePlanId === planId) {
      const remaining = plans.filter((p) => p.id !== planId)
      if (remaining.length > 0) {
        loadPlan(remaining[0].id)
      } else {
        setActivePlanId(null)
        setMessages([])
        createPlan()
      }
    }
  }

  // Auto-generate title from first user message
  const autoTitle = useCallback(
    async (msgs: Message[]) => {
      if (!activePlanId) return
      const plan = plans.find((p) => p.id === activePlanId)
      if (plan?.title && plan.title !== "Nova viagem") return
      const first = msgs.find((m) => m.role === "user")
      if (!first) return
      const title = first.content.slice(0, 60) + (first.content.length > 60 ? "..." : "")
      await updateTitle(activePlanId, title)
    },
    [activePlanId, plans]
  )

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return

    // Create plan if none active
    if (!activePlanId) {
      await createPlan()
    }

    const userMsg: Message = { role: "user", content: input }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    const text = input
    setInput("")
    setLoading(true)

    // Save immediately
    await saveMessages(updatedMessages)

    const apiMessages = updatedMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erro ao comunicar com o servidor")
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("Resposta sem corpo")

      const assistantMsg: Message = { role: "assistant", content: "" }
      const withAssistant = [...updatedMessages, assistantMsg]
      setMessages(withAssistant)

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
            // ignora
          }
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `**Erro:** ${err instanceof Error ? err.message : "Erro desconhecido"}`,
        },
      ])
    } finally {
      // Save final messages and auto-title
      setMessages((prev) => {
        saveMessages(prev)
        autoTitle(prev)
        return prev
      })
      setLoading(false)
    }
  }

  const hasMemories = Object.keys(memories).length > 0
  const activePlan = plans.find((p) => p.id === activePlanId)

  return (
    <div className="flex h-full w-full">
      {/* Onboarding / Edit modal */}
      {(showOnboarding || showEdit) && (
        <Onboarding
          initial={showEdit ? memories : undefined}
          onSave={saveMemories}
          onClose={
            showOnboarding && !showEdit ? () => setShowOnboarding(false) : undefined
          }
        />
      )}

      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-72 bg-zinc-900 border-r border-white/10 flex flex-col shrink-0">
          <div className="p-3 border-b border-white/10">
            <button
              onClick={() => createPlan()}
              className="w-full py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors"
            >
              + Novo Plano
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                  plan.id === activePlanId
                    ? "bg-blue-600/20 text-blue-300"
                    : "text-white/70 hover:bg-white/5"
                }`}
                onClick={() => loadPlan(plan.id)}
              >
                <span className="text-base">✈️</span>
                <div className="flex-1 min-w-0">
                  {editingTitle === plan.id ? (
                    <input
                      type="text"
                      value={editTitleValue}
                      onChange={(e) => setEditTitleValue(e.target.value)}
                      onBlur={() => updateTitle(plan.id, editTitleValue)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          updateTitle(plan.id, editTitleValue)
                        if (e.key === "Escape") setEditingTitle(null)
                      }}
                      className="w-full bg-white/10 rounded px-1 text-white text-xs"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <p className="truncate text-xs">
                      {plan.title || "Sem título"}
                    </p>
                  )}
                  <p className="text-[10px] text-white/30">
                    {new Date(plan.updatedAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="hidden group-hover:flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingTitle(plan.id)
                      setEditTitleValue(plan.title || "")
                    }}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/50"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm("Excluir este plano?")) deletePlan(plan.id)
                    }}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/50"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b border-white/10 px-4 py-3 flex items-center justify-between bg-white/5 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white/50 hover:text-white transition-colors text-lg shrink-0"
            >
              ☰
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-white truncate">
                {activePlan?.title || "ZucaTravel"}
              </h1>
              <p className="text-xs text-white/40 truncate">
                {userName ? `Olá, ${userName}` : "Planejador de Viagens com IA"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasMemories && (
              <button
                onClick={() => setShowEdit(true)}
                className="text-xs px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
              >
                Preferências
              </button>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-xs px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
            >
              Sair
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-white/30">
              <div className="text-5xl mb-4">✈️</div>
              <p className="text-sm">Comece um novo plano de viagem</p>
              <p className="text-xs mt-1">
                Descreva seu destino ideal que eu ajudo a planejar!
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
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
          className="border-t border-white/10 px-4 py-3 shrink-0"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                activePlanId
                  ? "Ex: Quero viajar para a Europa em agosto..."
                  : "Crie um plano para começar..."
              }
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
    </div>
  )
}
