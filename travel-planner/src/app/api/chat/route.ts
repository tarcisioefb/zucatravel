import { getOpenCodeClient } from "@/lib/opencode"
import { travelTools, executarTool } from "@/lib/tools"
import OpenAI from "openai"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const { messages, apiKey } = (await req.json()) as {
      messages: OpenAI.ChatCompletionMessageParam[]
      apiKey?: string
    }

    const model =
      (process.env.OPENCODE_GO_MODEL as string) || "deepseek-v4-flash"
    const client = getOpenCodeClient(apiKey)

    const stream = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `Você é um assistente de viagens direto ao ponto.

## Ferramentas
- **search_web** — busca preços/hospedagem/atrações atuais
- **calcular_orcamento** — calcula orçamento total
- **sugerir_roteiro** — monta roteiro dia a dia

## Regras de resposta
- Seja **sucinto**. Prefira tópicos a parágrafos.
- Use **tabelas simples** para comparar (ex: épocas, preços).
- Sempre termine com uma **recomendação clara**.
- Sem gírias, sem emojis, sem rodeios.
- Se o usuário pedir busca, use search_web antes de responder.`,
        },
        ...messages,
      ],
      tools: travelTools,
      tool_choice: "auto",
      stream: true,
      stream_options: { include_usage: true },
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        const toolCalls: Array<{
          id: string
          type: "function"
          function: { name: string; arguments: string }
        }> = []

        for await (const chunk of stream) {
          const delta = chunk.choices?.[0]?.delta

          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0
              if (!toolCalls[idx]) {
                toolCalls[idx] = {
                  id: tc.id || "",
                  type: "function",
                  function: { name: "", arguments: "" },
                }
              }
              if (tc.id) toolCalls[idx].id = tc.id
              if (tc.function?.name) toolCalls[idx].function.name += tc.function.name
              if (tc.function?.arguments)
                toolCalls[idx].function.arguments += tc.function.arguments
            }
          }

          if (delta?.content) {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({ type: "text", content: delta.content }) + "\n"
              )
            )
          }

          if (chunk.choices?.[0]?.finish_reason === "tool_calls") {
            const results: string[] = []
            for (const toolCall of toolCalls) {
              let args: Record<string, unknown> = {}
              try {
                args = JSON.parse(toolCall.function.arguments)
              } catch {
                args = {}
              }
              const result = await executarTool(toolCall.function.name, args)
              results.push(result)

              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: "tool_use",
                    tool: toolCall.function.name,
                    args: args,
                    result: result,
                  }) + "\n"
                )
              )
            }

            const followUp = await client.chat.completions.create({
              model,
              messages: [
                {
                  role: "system",
                  content: `Você é um assistente de viagens direto ao ponto.

## Regras de resposta
- Seja **sucinto**. Prefira tópicos a parágrafos.
- Use **tabelas simples** para comparar.
- Sempre termine com uma **recomendação clara**.
- Sem gírias, sem emojis, sem rodeios.`,
                },
                ...messages,
                {
                  role: "assistant",
                  content: null,
                  tool_calls: toolCalls.map((tc) => ({
                    id: tc.id,
                    type: "function" as const,
                    function: {
                      name: tc.function.name,
                      arguments: tc.function.arguments,
                    },
                  })),
                },
                ...toolCalls.map((tc, i) => ({
                  role: "tool" as const,
                  tool_call_id: tc.id,
                  content: results[i],
                })),
              ],
              stream: true,
              stream_options: { include_usage: true },
            })

            for await (const chunk of followUp) {
              const content = chunk.choices?.[0]?.delta?.content
              if (content) {
                controller.enqueue(
                  encoder.encode(
                    JSON.stringify({ type: "text", content }) + "\n"
                  )
                )
              }
            }
          }
        }

        controller.enqueue(encoder.encode(JSON.stringify({ type: "done" }) + "\n"))
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido"
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
