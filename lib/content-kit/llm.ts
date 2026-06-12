import "server-only"

import Anthropic from "@anthropic-ai/sdk"

// OpenRouter is primary because it's the funded key (Maya runs on it).
// Direct Anthropic is the fallback when OpenRouter is down.
const OPENROUTER_MODEL = "anthropic/claude-sonnet-4.5"
const ANTHROPIC_MODEL = "claude-sonnet-4-5"
const MAX_TOKENS = 8000

export async function callContentKitLlm(prompt: string): Promise<string> {
  const openrouterKey = process.env.OPENROUTER_API_KEY
  if (openrouterKey) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openrouterKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          max_tokens: MAX_TOKENS,
          messages: [{ role: "user", content: prompt }],
        }),
      })
      if (response.ok) {
        const data = await response.json()
        const text = data?.choices?.[0]?.message?.content
        if (typeof text === "string" && text.trim()) return text
      } else {
        console.error("[content-kit] OpenRouter failed:", response.status, await response.text())
      }
    } catch (error) {
      console.error("[content-kit] OpenRouter error, falling back to Anthropic:", error)
    }
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) throw new Error("No LLM available: OPENROUTER_API_KEY failed and ANTHROPIC_API_KEY is not set")
  const client = new Anthropic({ apiKey: anthropicKey })
  const message = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: "user", content: prompt }],
  })
  const block = message.content.find((item) => item.type === "text")
  if (!block || block.type !== "text") throw new Error("Anthropic returned no text")
  return block.text
}

export function extractJsonArray(text: string): any {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : text
  const start = candidate.indexOf("[")
  const end = candidate.lastIndexOf("]")
  if (start === -1 || end === -1) throw new Error("LLM response contained no JSON array")
  return JSON.parse(candidate.slice(start, end + 1))
}
