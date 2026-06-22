import OpenAI from "openai"

export const travelTools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_web",
      description:
        "Busca informações atualizadas na internet sobre destinos, passagens, hotéis, etc.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Termo de busca (ex: 'passagens SP para Paris setembro 2025 preços')",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calcular_orcamento",
      description:
        "Calcula orçamento estimado de uma viagem com base em valores informados pelo usuário.",
      parameters: {
        type: "object",
        properties: {
          destino: { type: "string" },
          origem: { type: "string" },
          passagem_aerea: { type: "number", description: "Custo estimado da passagem" },
          hospedagem_por_noite: { type: "number" },
          numero_noites: { type: "number" },
          alimentacao_por_dia: { type: "number" },
          passeios: { type: "number", description: "Custo total estimado com passeios" },
          transporte_local_por_dia: { type: "number" },
          moeda: { type: "string", default: "BRL" },
        },
        required: [
          "destino",
          "origem",
          "passagem_aerea",
          "hospedagem_por_noite",
          "numero_noites",
          "alimentacao_por_dia",
          "moeda",
        ],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "sugerir_roteiro",
      description:
        "Sugere um roteiro detalhado para uma viagem com base no destino, duração e interesses.",
      parameters: {
        type: "object",
        properties: {
          destino: { type: "string" },
          dias: { type: "number" },
          interesses: {
            type: "array",
            items: { type: "string" },
            description:
              "Ex: ['gastronomia', 'história', 'natureza', 'compras', 'vida noturna']",
          },
          orcamento_por_dia: { type: "number" },
        },
        required: ["destino", "dias", "interesses"],
      },
    },
  },
]

export async function executarTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "search_web":
      return searchWeb(args.query as string)
    case "calcular_orcamento":
      return calcularOrcamento(args)
    case "sugerir_roteiro":
      return sugerirRoteiro(args)
    default:
      return `Tool "${name}" não reconhecida.`
  }
}

async function searchWeb(query: string): Promise<string> {
  const tavilyKey = process.env.TAVILY_API_KEY
  if (!tavilyKey) {
    return `[AVISO] Chave Tavily não configurada. Para buscas reais, cadastre-se em tavily.com e adicione TAVILY_API_KEY no .env.local

Baseie sua resposta no que você já sabe sobre o assunto. A busca era: "${query}"`
  }
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavilyKey,
        query,
        search_depth: "advanced",
        max_results: 5,
      }),
    })
    const data = await res.json()
    if (!data.results?.length) return "Nenhum resultado encontrado."
    return data.results
      .map(
        (r: { title: string; url: string; content: string }) =>
          `[${r.title}](${r.url})\n${r.content}`
      )
      .join("\n\n")
  } catch (err) {
    return `Erro na busca: ${err instanceof Error ? err.message : "desconhecido"}`
  }
}

function calcularOrcamento(args: Record<string, unknown>): string {
  const passagem = Number(args.passagem_aerea) || 0
  const hospedagem = Number(args.hospedagem_por_noite) || 0
  const noites = Number(args.numero_noites) || 1
  const alimentacao = Number(args.alimentacao_por_dia) || 0
  const passeios = Number(args.passeios) || 0
  const transporte = Number(args.transporte_local_por_dia) || 0
  const moeda = (args.moeda as string) || "BRL"

  const totalHospedagem = hospedagem * noites
  const totalAlimentacao = alimentacao * noites
  const totalTransporte = transporte * noites
  const totalGeral =
    passagem + totalHospedagem + totalAlimentacao + passeios + totalTransporte

  return JSON.stringify(
    {
      origem: args.origem,
      destino: args.destino,
      moeda,
      itens: [
        { descricao: "Passagem aérea (ida e volta)", valor: passagem },
        { descricao: `Hospedagem (${noites} noites)`, valor: totalHospedagem },
        { descricao: `Alimentação (${noites} dias)`, valor: totalAlimentacao },
        { descricao: "Passeios", valor: passeios },
        { descricao: `Transporte local (${noites} dias)`, valor: totalTransporte },
      ],
      total: totalGeral,
    },
    null,
    2
  )
}

function sugerirRoteiro(args: Record<string, unknown>): string {
  return JSON.stringify(
    {
      destino: args.destino,
      dias: args.dias,
      interesses: args.interesses,
      nota: "Monte um roteiro detalhado dia a dia com base no destino e interesses informados.",
    },
    null,
    2
  )
}
