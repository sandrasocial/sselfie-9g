import { STELLA_CHARTER, STELLA_MODES } from "@/lib/stella/charter"

const OPENAI_URL = "https://api.openai.com/v1/responses"

export type StellaMode = keyof typeof STELLA_MODES | "general"

export async function stellaReply(params: { message: string; mode?: StellaMode }) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured")
  }

  const rawModel = (process.env.STELLA_MODEL || "").trim()
  const model = rawModel === "gpt-4.1-min" || rawModel === "" ? "gpt-4.1-mini" : rawModel
  const mode = params.mode && STELLA_MODES[params.mode] ? params.mode : "general"
  const modeText = mode === "general" ? "General" : STELLA_MODES[mode]

  const systemPrompt = `${STELLA_CHARTER}\n\nCurrent focus mode: ${modeText}`

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: params.message }
      ],
      max_output_tokens: 1200
    })
  })

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
