import OpenAI from "openai"

const OPENCODE_GO_BASE = "https://opencode.ai/zen/go/v1"

let client: OpenAI | null = null

export function getOpenCodeClient(apiKey?: string): OpenAI {
  const key = apiKey || process.env.OPENCODE_GO_KEY
  if (!key) {
    throw new Error(
      "Chave do OpenCode Go não configurada. Defina OPENCODE_GO_KEY no .env.local."
    )
  }
  if (client && !apiKey) return client
  return new OpenAI({
    baseURL: OPENCODE_GO_BASE,
    apiKey: key,
  })
}
