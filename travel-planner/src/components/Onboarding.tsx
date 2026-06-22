"use client"

import { useState } from "react"

type Answers = Record<string, string>

const PERGUNTAS = [
  { key: "origem", pergunta: "De onde você vai viajar?", placeholder: "Ex: São Paulo - SP" },
  { key: "destino_favorito", pergunta: "Tem algum destino dos sonhos?", placeholder: "Ex: Japão, Paris, Nova York..." },
  { key: "epoca_preferida", pergunta: "Qual época do ano você prefere viajar?", placeholder: "Ex: verão, inverno, qualquer época" },
  { key: "orcamento_maximo", pergunta: "Qual o orçamento máximo por viagem?", placeholder: "Ex: R$ 5.000 por pessoa" },
  { key: "interesses", pergunta: "O que você gosta de fazer nas viagens?", placeholder: "Ex: praia, gastronomia, história, natureza" },
  { key: "companhia", pergunta: "Com quem você costuma viajar?", placeholder: "Ex: sozinho, casal, família, amigos" },
  { key: "restricao_alimentar", pergunta: "Tem alguma restrição alimentar?", placeholder: "Ex: sem restrições, vegetariano, sem glúten" },
]

export default function Onboarding({
  initial,
  onSave,
  onClose,
}: {
  initial?: Record<string, string>
  onSave: (answers: Answers) => void
  onClose?: () => void
}) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>(initial ?? {})
  const [saving, setSaving] = useState(false)

  function setAnswer(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }))
  }

  function next() {
    if (step < PERGUNTAS.length - 1) {
      setStep(step + 1)
    }
  }

  function prev() {
    if (step > 0) setStep(step - 1)
  }

  async function finish() {
    setSaving(true)
    await onSave(answers)
    setSaving(false)
  }

  const current = PERGUNTAS[step]
  const answeredCount = Object.keys(answers).filter(
    (k) => answers[k]?.trim()
  ).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">✈️</span>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {initial ? "Editar Preferências" : "Bem-vindo ao ZucaTravel!"}
              </h2>
              <p className="text-sm text-white/40">
                {initial
                  ? "Atualize suas informações"
                  : "Responda rápido pra eu te conhecer melhor"}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex gap-1 mt-4">
            {PERGUNTAS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full ${
                  i <= step ? "bg-blue-500" : "bg-white/10"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-white/30 mt-1">
            {step + 1} de {PERGUNTAS.length}
          </p>
        </div>

        {/* Question */}
        <div className="px-6 py-6">
          <label className="block text-white font-medium mb-2">
            {current.pergunta}
          </label>
          <input
            type="text"
            value={answers[current.key] || ""}
            onChange={(e) => setAnswer(current.key, e.target.value)}
            placeholder={current.placeholder}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (step < PERGUNTAS.length - 1) next()
                else finish()
              }
            }}
            className="w-full px-4 py-2.5 text-sm rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30"
          />
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex items-center justify-between">
          <div>
            {step > 0 ? (
              <button
                onClick={prev}
                className="text-sm px-4 py-2 text-white/50 hover:text-white transition-colors"
              >
                Voltar
              </button>
            ) : (
              <div />
            )}
          </div>
          <div className="flex gap-2">
            {onClose && !initial && (
              <button
                onClick={onClose}
                className="text-sm px-4 py-2 text-white/50 hover:text-white transition-colors"
              >
                Pular
              </button>
            )}
            {step < PERGUNTAS.length - 1 ? (
              <button
                onClick={next}
                className="text-sm px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors"
              >
                Próximo
              </button>
            ) : (
              <button
                onClick={finish}
                disabled={saving}
                className="text-sm px-5 py-2 bg-green-600 hover:bg-green-500 disabled:bg-white/10 text-white rounded-xl transition-colors"
              >
                {saving ? "Salvando..." : initial ? "Salvar" : "Começar!"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
