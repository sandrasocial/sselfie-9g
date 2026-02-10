import { STELLA_CHARTER, STELLA_MODES } from "@/lib/stella/charter"

const OPENAI_URL = "https://api.openai.com/v1/responses"
const DEFAULT_TIMEOUT_MS = 25_000

export type StellaMode = keyof typeof STELLA_MODES | "general"

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchWithRetry(
  input: string,
  init: RequestInit,
  opts: { retries: number; timeoutMs: number }
) {
  let lastErr: unknown = null
  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), opts.timeoutMs)
    try {
      const res = await fetch(input, { ...init, signal: controller.signal })
      clearTimeout(timeout)

      if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
        lastErr = new Error(`HTTP ${res.status}`)
        if (attempt < opts.retries) {
          // Basic exponential backoff with jitter.
          const backoff = Math.min(200 * (2 ** attempt), 2000) + Math.floor(Math.random() * 150)
          await sleep(backoff)
          continue
        }
      }

      return res
    } catch (err) {
      clearTimeout(timeout)
      lastErr = err
      if (attempt < opts.retries) {
        const backoff = Math.min(200 * (2 ** attempt), 2000) + Math.floor(Math.random() * 150)
        await sleep(backoff)
        continue
      }
      throw err
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Fetch failed")
}

export async function stellaReply(params: { message: string; mode?: StellaMode }) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured")
  }

  const message = (params.message || "").trim()
  if (!message) return "Tell me what you want help with."
  // Keep worst-case token cost bounded even if an upstream caller sends huge context.
  const cappedMessage = message.length > 20_000 ? message.slice(0, 20_000) + "\n\n[truncated]" : message

  const rawModel = (process.env.STELLA_MODEL || "").trim()
  const model = rawModel === "gpt-4.1-min" || rawModel === "" ? "gpt-4.1-mini" : rawModel
  const mode = params.mode && STELLA_MODES[params.mode] ? params.mode : "general"
  const modeText = mode === "general" ? "General" : STELLA_MODES[mode]

  const systemPrompt = `${STELLA_CHARTER}\n\nCurrent focus mode: ${modeText}`

  const response = await fetchWithRetry(OPENAI_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: cappedMessage }
      ],
      max_output_tokens: 1200
    })
  }, { retries: 2, timeoutMs: DEFAULT_TIMEOUT_MS })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI error ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  const outputText = (data.output || [])
    .filter((item: any) => item.type === "message")
    .flatMap((item: any) => item.content || [])
    .filter((content: any) => content.type === "output_text")
    .map((content: any) => content.text)
    .join("\n")
    .trim()

  return outputText || "Stella responded, but no text was returned."
}

export function parseStellaMode(message: string): { mode: StellaMode; cleaned: string } {
  const trimmed = message.trim()
  const modePrefix = /^mode:\s*(vision|growth|content|systems|product)\b/i
  const match = trimmed.match(modePrefix)
  if (match) {
    const mode = match[1].toLowerCase() as StellaMode
    const cleaned = trimmed.replace(modePrefix, "").trim()
    return { mode, cleaned: cleaned || trimmed }
  }
  return { mode: "general", cleaned: trimmed }
}
