import { type NextRequest, NextResponse } from "next/server"

import {
  buildPromptPageUrl,
  buildPromptPageVaultCheckoutHref,
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
  const prompt = await getPromptByNumber(number)

  if (!prompt) {
    return NextResponse.json({
      ok: true,
      found: false,
      number,
      title: "That prompt is coming",
      pageUrl: `${url.origin.replace(/^https:\/\/sselfie\.ai$/, "https://www.sselfie.ai")}/prompt-vault?source=manychat_prompt_lookup&utm_source=instagram&utm_medium=manychat&utm_campaign=numbered_prompt_fallback&cta_keyword=${encodeURIComponent(number || "UNKNOWN")}`,
      fallbackMessage: "That one is not published yet, but the Vault is ready.",
    })
  }

  return NextResponse.json({
    ok: true,
    found: true,
    number: prompt.number,
    title: prompt.card.title,
    pageUrl: buildPromptPageUrl(prompt.number),
    vaultCheckoutUrl: buildPromptPageVaultCheckoutHref({
      promptNumber: prompt.number,
      promptId: prompt.card.id,
      promptTitle: prompt.card.title,
    }),
    sourceCollection: prompt.sourceCollection,
  })
}
