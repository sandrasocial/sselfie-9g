import { generateText } from "ai"
import { NextResponse } from "next/server"

import { logAnalyticsEvent } from "@/lib/analytics/events"
import { academyRouteErrorToResponse, requireAcademyUser } from "@/lib/academy-server-access"
import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { sql } from "@/lib/db/client"
import {
  buildFallbackPromptPack,
  hasUsefulVisualCode,
  normalizeSelfieToBrandShootVisualCode,
  SELFIE_TO_BRAND_SHOOT_VISUAL_CODE_MEMORY_KEY,
  type SelfieToBrandShootPromptPack,
  type SelfieToBrandShootVisualCode,
} from "@/lib/selfie-to-brand-shoot/visual-code"

export const runtime = "nodejs"
export const maxDuration = 30

async function userCanUseSelfieToBrandShoot(userId: string, email?: string | null) {
  const entitlementState = await getAcademyEntitlementState(userId)
  if (
    entitlementState.membershipActive ||
    entitlementState.accessibleProductIds.includes("selfie_to_brand_shoot_system")
  ) {
    return true
  }

  if (!email) return false

  const subscriberRows = await sql`
    SELECT 1
    FROM freebie_subscribers
    WHERE LOWER(email) = LOWER(${email})
      AND (
        source = 'selfie-to-brand-shoot-paid'
        OR 'selfie-to-brand-shoot-paid' = ANY(COALESCE(email_tags, ARRAY[]::text[]))
        OR 'bought_selfie_to_brand_shoot_system' = ANY(COALESCE(email_tags, ARRAY[]::text[]))
        OR 'prompt-vault-admin-access' = ANY(COALESCE(email_tags, ARRAY[]::text[]))
      )
    LIMIT 1
  `

  return subscriberRows.length > 0
}

function normalizeUseCases(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map(item => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 8)
}

function extractJsonObject(text: string) {
  const trimmed = text.trim()
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) return fenced[1].trim()

  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1)

  return trimmed
}

function coercePromptPack(value: unknown): SelfieToBrandShootPromptPack | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>

  const readCards = (cards: unknown) => {
    if (!Array.isArray(cards)) return []
    return cards
      .map(card => {
        if (!card || typeof card !== "object") return null
        const item = card as Record<string, unknown>
        const title = typeof item.title === "string" ? item.title.trim() : ""
        const purpose = typeof item.purpose === "string" ? item.purpose.trim() : ""
        const copy = typeof item.copy === "string" ? item.copy.trim() : ""
        const prompt = typeof item.prompt === "string" ? item.prompt.trim() : ""
        if (!title || !purpose || !prompt) return null
        return {
          title: title.slice(0, 120),
          purpose: purpose.slice(0, 180),
          copy: copy.slice(0, 700),
          prompt: prompt.slice(0, 2000),
        }
      })
      .filter((card): card is NonNullable<typeof card> => Boolean(card))
  }

  const pack = {
    starterShoot: readCards(record.starterShoot).slice(0, 3),
    extraImages: readCards(record.extraImages).slice(0, 4),
    fixPrompts: readCards(record.fixPrompts).slice(0, 6),
    consistencyNotes: Array.isArray(record.consistencyNotes)
      ? record.consistencyNotes
          .map(note => (typeof note === "string" ? note.trim() : ""))
          .filter(Boolean)
          .slice(0, 6)
      : [],
  }

  if (pack.starterShoot.length < 3 || pack.extraImages.length < 1 || pack.fixPrompts.length < 3) {
    return null
  }

  return pack
}

export async function POST(request: Request) {
  try {
    const user = await requireAcademyUser()
    const hasAccess = await userCanUseSelfieToBrandShoot(user.neonUser.id, user.neonUser.email)

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Selfie to Brand Shoot access required", hasAccess: false },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => null)
    const useCases = normalizeUseCases(body?.useCases)
    const notes = typeof body?.notes === "string" ? body.notes.trim().slice(0, 1200) : ""

    let visualCode = normalizeSelfieToBrandShootVisualCode(body?.visualCode)

    if (!hasUsefulVisualCode(visualCode)) {
      const rows = await sql`
        SELECT memory_data->${SELFIE_TO_BRAND_SHOOT_VISUAL_CODE_MEMORY_KEY} AS visual_code
        FROM maya_personal_memory
        WHERE user_id = ${user.neonUser.id}
        LIMIT 1
      `
      const firstRow = rows[0] as
        | { visual_code?: Partial<SelfieToBrandShootVisualCode> }
        | undefined
      visualCode = normalizeSelfieToBrandShootVisualCode(firstRow?.visual_code)
    }

    if (!hasUsefulVisualCode(visualCode)) {
      return NextResponse.json(
        { error: "Paste and save your Visual Consistency Code first." },
        { status: 400 }
      )
    }

    const fallback = buildFallbackPromptPack(visualCode, useCases)

    try {
      const { text } = await generateText({
        model: "anthropic/claude-haiku-4-5-20251001",
        temperature: 0.35,
        maxOutputTokens: 2400,
        system: `You are Maya inside SSELFIE.

You are creating a custom Selfie to Brand Shoot prompt pack.
The user will upload one source selfie into ChatGPT and paste these prompts.

Voice and style:
- Premium, clear, feminine, practical.
- Sandra/SSELFIE tone: calm, visual, editorial, no tech jargon.
- Do not mention backend, models, APIs, V1, placeholders, or implementation.
- Do not promise perfect likeness.
- Teach visual consistency: one world, many roles.

Return valid JSON only with this exact shape:
{
  "starterShoot": [{"title": "", "purpose": "", "copy": "", "prompt": ""}],
  "extraImages": [{"title": "", "purpose": "", "copy": "", "prompt": ""}],
  "fixPrompts": [{"title": "", "purpose": "", "copy": "", "prompt": ""}],
  "consistencyNotes": [""]
}`,
        prompt: `Create a prompt pack from this Visual Consistency Code:
Signature Visual World: ${visualCode.signatureVisualWorld}
Main colors: ${visualCode.mainColors}
Lighting: ${visualCode.lighting}
Wardrobe direction: ${visualCode.wardrobeDirection}
Background world: ${visualCode.backgroundWorld}
Emotional signal: ${visualCode.emotionalSignal}
What she wants people to feel: ${visualCode.desiredFeeling || ""}
What she will repeat: ${visualCode.repeatRules || ""}
What she will avoid: ${visualCode.avoidRules || ""}
First shoot direction: ${visualCode.firstShootDirection || ""}
Use cases requested: ${useCases.join(", ") || "profile photo, reel cover, lifestyle image, offer image, story image, website/about image"}
Extra notes: ${notes}

Required groups:
starterShoot must include exactly:
- Signature Profile Portrait
- Editorial Reel Cover
- Lifestyle Brand Image

extraImages must include:
- Offer / Launch Visual
- Story Image
- Website / About Image

fixPrompts must include:
- Make it look more like me
- Make it less AI
- Make it softer
- Make it more editorial
- Improve pose, crop, or lighting

Each prompt must explicitly say to use the uploaded source selfie as identity reference and keep the same Signature Visual World.`,
      })

      const parsed = JSON.parse(extractJsonObject(text))
      const pack = coercePromptPack(parsed)
      if (pack) {
        logAnalyticsEvent({
          eventName: "selfie_to_brand_shoot_maya_prompt_pack_built",
          userId: user.neonUser.id,
          path: "/api/selfie-to-brand-shoot/prompt-pack",
          properties: {
            product_id: "selfie_to_brand_shoot_system",
            source: "maya",
            use_cases: useCases,
            starter_count: pack.starterShoot.length,
            extra_count: pack.extraImages.length,
            fix_count: pack.fixPrompts.length,
          },
        }).catch(() => {})
        return NextResponse.json({ promptPack: pack, source: "maya" })
      }
    } catch (error) {
      console.error("[selfie-to-brand-shoot prompt-pack] Maya generation fallback used:", error)
    }

    logAnalyticsEvent({
      eventName: "selfie_to_brand_shoot_maya_prompt_pack_built",
      userId: user.neonUser.id,
      path: "/api/selfie-to-brand-shoot/prompt-pack",
      properties: {
        product_id: "selfie_to_brand_shoot_system",
        source: "fallback",
        use_cases: useCases,
        starter_count: fallback.starterShoot.length,
        extra_count: fallback.extraImages.length,
        fix_count: fallback.fixPrompts.length,
      },
    }).catch(() => {})

    return NextResponse.json({ promptPack: fallback, source: "fallback" })
  } catch (error) {
    const routeError = academyRouteErrorToResponse(error)
    if (routeError) return routeError

    console.error("[selfie-to-brand-shoot prompt-pack] failed:", error)
    return NextResponse.json(
      { error: "Maya could not build your prompt pack right now." },
      { status: 500 }
    )
  }
}
