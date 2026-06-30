import { type NextRequest, NextResponse } from "next/server"

import { siteUrl } from "@/lib/ai-prompts/prompt-lookup"

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

  const baseUrl = siteUrl()
  const pageParams = new URLSearchParams({
    source: "manychat_prompt",
    utm_source: "instagram",
    utm_medium: "manychat",
    utm_campaign: "latest_five_free_prompts",
    utm_content: "prompt_pack_delivery",
    checkout_source: "manychat_prompt_delivery",
    cta_keyword: "PROMPT",
    buyer_stage: "lead",
  })
  const vaultParams = new URLSearchParams({
    source: "ai_prompts_manychat",
    utm_source: "instagram",
    utm_medium: "manychat",
    utm_campaign: "latest_five_free_prompts_to_vault",
    utm_content: "prompt_pack_delivery",
    checkout_source: "manychat_prompt_delivery",
    cta_keyword: "PROMPT",
    buyer_stage: "lead",
  })

  return NextResponse.json({
    ok: true,
    found: false,
    fallback: true,
    mode: "latest_five_free_prompts",
    requestedNumber: null,
    number: null,
    title: "The latest five SSELFIE shoot previews",
    pageUrl: `${baseUrl}/ai-prompts?${pageParams.toString()}`,
    vaultCheckoutUrl: `${baseUrl}/checkout/prompt-vault?${vaultParams.toString()}`,
    dm: {
      opener: "Here are the latest five SSELFIE shoot previews.",
      pageButtonText: "Open the free prompts",
      vaultButtonText: "Get the full Vault",
      proofLine: "Start with one selfie. Test the newest free shoot previews, then use the Vault when you want the full shoot worlds.",
      followupHours: [24, 48],
    },
    manychatTags: ["prompt-requester", "prompt-latest-five"],
    fallbackMessage: "PROMPT uses the five latest free shoot previews. Numbered ManyChat keywords are intentionally retired.",
    sourceCollection: "latest-five-free-prompts",
  })
}
