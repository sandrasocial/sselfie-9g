import { type NextRequest, NextResponse } from "next/server"

import {
  buildLatestPromptPageUrl,
  buildPromptPageUrl,
  buildPromptPageVaultCheckoutHref,
  getCurrentFreePrompt,
  getPromptByNumber,
} from "@/lib/ai-prompts/prompt-lookup"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

function readSecret(request: NextRequest): string | null {
  const url = new URL(request.url)
  return (
    request.headers.get("x-bridge-secret")?.trim() ||
    request.headers.get("x-manychat-secret")?.trim() ||
    url.searchParams.get("secret")?.trim() ||
    url.searchParams.get("bridge_secret")?.trim() ||
    null
  )
}

export async function GET(request: NextRequest) {
  const secret = process.env.MANYCHAT_BRIDGE_SECRET?.trim()
  if (!secret) {
    return NextResponse.json({ ok: false, error: "Bridge not enabled" }, { status: 503 })
  }

  const provided = readSecret(request)
  if (!provided || !timingSafeEqual(provided, secret)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 401 })
  }

  const url = new URL(request.url)
  const number = url.searchParams.get("n")?.trim() || ""
  const exactPrompt = number ? await getPromptByNumber(number) : null
  const prompt = exactPrompt || await getCurrentFreePrompt()

  if (!prompt) {
    return NextResponse.json({
      ok: true,
      found: false,
      fallback: true,
      number,
      title: "That prompt is coming",
      pageUrl: `${url.origin.replace(/^https:\/\/sselfie\.ai$/, "https://www.sselfie.ai")}/prompt-vault?source=manychat_prompt_lookup&utm_source=instagram&utm_medium=manychat&utm_campaign=numbered_prompt_fallback&cta_keyword=${encodeURIComponent(number || "UNKNOWN")}`,
      dm: {
        opener: "That exact prompt is not published yet, but the Vault is ready.",
        pageButtonText: "See the Vault",
        proofLine: "One selfie can become a full editorial shoot world when the prompt gives it direction.",
        followupHours: [24, 48],
      },
      manychatTags: ["prompt-requester", "prompt-fallback"],
      fallbackMessage: "That one is not published yet, but the Vault is ready.",
    })
  }

  const fallback = !exactPrompt
  const pageAttribution = {
    source: fallback ? "prompt_latest" : "instagram_manychat",
    utm_source: "instagram",
    utm_medium: "manychat",
    utm_campaign: fallback ? "current_free_prompt" : "numbered_prompt",
    utm_content: fallback ? "prompt_latest" : `prompt_${prompt.number}`,
    checkout_source: "manychat_prompt_reply",
    cta_keyword: fallback ? "PROMPT" : prompt.number,
    buyer_stage: "lead",
  }

  return NextResponse.json({
    ok: true,
    found: Boolean(exactPrompt),
    fallback,
    requestedNumber: number || null,
    number: prompt.number,
    title: prompt.card.title,
    pageUrl: fallback ? buildLatestPromptPageUrl() : buildPromptPageUrl(prompt.number, pageAttribution),
    vaultCheckoutUrl: buildPromptPageVaultCheckoutHref({
      promptNumber: prompt.number,
      promptId: prompt.card.id,
      promptTitle: prompt.card.title,
      attribution: pageAttribution,
    }),
    dm: {
      opener: `Here is prompt #${prompt.number}: ${prompt.card.title}.`,
      pageButtonText: "Open my prompt",
      vaultButtonText: "Get the full Vault",
      proofLine: "Start with one selfie. Use this prompt to test one image today. If it gets close, the Vault gives you the full shoot world around it.",
      followupHours: [24, 48],
    },
    manychatTags: [
      "prompt-requester",
      `prompt-${prompt.number}`,
      fallback ? "prompt-latest-fallback" : "prompt-numbered",
    ],
    fallbackMessage: fallback
      ? "Here is today’s free prompt. For older reels, use a post-specific URL when you know the exact prompt."
      : null,
    sourceCollection: prompt.sourceCollection,
  })
}
