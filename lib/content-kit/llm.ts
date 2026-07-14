import "server-only"

import Anthropic from "@anthropic-ai/sdk"
import { groundingSystemPrompt } from "@/lib/content/grounding"

// OpenRouter is primary because it's the funded key (Maya runs on it).
// Direct Anthropic is the fallback when OpenRouter is down.
const OPENROUTER_MODEL = "anthropic/claude-sonnet-5"
const ANTHROPIC_MODEL = "claude-sonnet-5"
const MAX_TOKENS = 8000

export async function callContentKitLlm(
  prompt: string,
  systemPrompt = groundingSystemPrompt()
): Promise<string> {
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
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
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
  if (!anthropicKey)
    throw new Error("No LLM available: OPENROUTER_API_KEY failed and ANTHROPIC_API_KEY is not set")
  const client = new Anthropic({ apiKey: anthropicKey })
  const message = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: "user", content: prompt }],
  })
  const block = message.content.find(item => item.type === "text")
  if (!block || block.type !== "text") throw new Error("Anthropic returned no text")
  return block.text
}

/**
 * Vision call: prompt + image URLs (public Blob URLs). OpenRouter primary (OpenAI-style
 * image_url blocks), direct Anthropic fallback (url image sources). Same models as text.
 */
export async function callContentKitVision(
  prompt: string,
  imageUrls: string[],
  systemPrompt = groundingSystemPrompt()
): Promise<string> {
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
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                ...imageUrls.map(url => ({ type: "image_url", image_url: { url } })),
                { type: "text", text: prompt },
              ],
            },
          ],
        }),
      })
      if (response.ok) {
        const data = await response.json()
        const text = data?.choices?.[0]?.message?.content
        if (typeof text === "string" && text.trim()) return text
      } else {
        console.error(
          "[content-kit] OpenRouter vision failed:",
          response.status,
          await response.text()
        )
      }
    } catch (error) {
      console.error("[content-kit] OpenRouter vision error, falling back to Anthropic:", error)
    }
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey)
    throw new Error("No LLM available: OPENROUTER_API_KEY failed and ANTHROPIC_API_KEY is not set")
  const client = new Anthropic({ apiKey: anthropicKey })
  const message = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: [
          ...imageUrls.map(url => ({
            type: "image" as const,
            source: { type: "url" as const, url },
          })),
          { type: "text" as const, text: prompt },
        ],
      },
    ],
  })
  const block = message.content.find(item => item.type === "text")
  if (!block || block.type !== "text") throw new Error("Anthropic returned no text")
  return block.text
}

export { extractJsonArray, repairAndParseJson } from "@/lib/content-kit/json-repair"
