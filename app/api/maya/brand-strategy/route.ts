import { generateText } from "ai"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getUserPersonalBrand } from "@/lib/data/maya"
import { sql } from "@/lib/db/client"
import { auditPromptRoute } from "@/lib/generation/prompt/route-audit"
import { createMayaOpenRouterModel, getMayaModelForTask } from "@/lib/maya/openrouter"

export const maxDuration = 90

const MODEL = getMayaModelForTask("chat_pro")
const MAX_OUTPUT_TOKENS = 2400

function buildPrompt(brandData: Record<string, any>) {
  return `You are Maya, a warm, sharp brand strategist.

Your job: generate a **strategy foundation** that feels personal, confident, and useful — not generic.
Use short sentences. Use Sandra’s tone (warm, honest, permission-giving). No corporate words.

**User brand data:**
${Object.entries(brandData)
  .map(([key, value]) => `${key}: ${value}`)
  .join("\n")}

**Return ONLY valid JSON** in this exact shape:
{
  "positioning": ["...", "..."],
  "pillars": [
    {"name":"...","description":"...","postIdeas":["...","...","..."]}
  ],
  "voice": {"tone":"...","do":"...","avoid":"...","phrases":["...","...","..."]},
  "captionStarters": ["...","...","..."],
  "examplePosts": [
    {"hook":"...","body":"...","cta":"..."}
  ]
}

Rules:
- Positioning: 1–2 options, 1–2 sentences each.
- Pillars: 3–5 pillars.
- Caption starters: 10.
- Example posts: 3, short and punchy.
- Use the user’s actual story + audience language.
`
}

function parseJsonFromText(text: string) {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error("No JSON found in response")
  return JSON.parse(jsonMatch[0])
}

async function generateStrategyPack(brandData: Record<string, any>) {
  const prompt = buildPrompt(brandData)
  const startedAt = Date.now()
  auditPromptRoute({
    routeId: "EP-SHADOW-BRAND-STRATEGY",
    mode: "classic",
    feature: "brand-strategy-pack",
    builder: MODEL,
    prompt,
    input: { brandData },
    startedAt,
  })
  const { text } = await generateText({
    model: createMayaOpenRouterModel("chat_pro"),
    prompt,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
  })
  try {
    return parseJsonFromText(text)
  } catch {
    const retryPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON. No markdown. No commentary.`
    const retry = await generateText({
      model: createMayaOpenRouterModel("chat_pro"),
      prompt: retryPrompt,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    })
    return parseJsonFromText(retry.text)
  }
}

export async function GET(req: Request) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      return new Response("Unauthorized", { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return new Response("Unauthorized", { status: 401 })
    }

    const brand = await getUserPersonalBrand(neonUser.id)
    if (!brand || !brand.is_completed) {
      return Response.json({ error: "Please complete your brand profile first." }, { status: 400 })
    }

    const url = new URL(req.url)
    const refresh = url.searchParams.get("refresh") === "true"

    if (!refresh && brand.brand_strategy_pack && brand.brand_strategy_pack_updated_at) {
      const updatedAt = new Date(brand.brand_strategy_pack_updated_at)
      const ageMs = Date.now() - updatedAt.getTime()
      const maxAgeMs = 30 * 24 * 60 * 60 * 1000
      if (ageMs < maxAgeMs) {
        return Response.json({
          cached: true,
          positioning: brand.positioning_statement ? [brand.positioning_statement] : brand.brand_strategy_pack.positioning,
          ...brand.brand_strategy_pack,
        })
      }
    }

    const brandData = {
      name: brand.name,
      business_type: brand.business_type,
      target_audience: brand.target_audience,
      brand_voice: brand.brand_voice,
      transformation_story: brand.transformation_story,
      future_vision: brand.future_vision,
      current_situation: brand.current_situation,
      photo_goals: brand.photo_goals,
      style_preferences: brand.style_preferences,
      content_pillars: brand.content_pillars,
      brand_vibe: brand.brand_vibe,
      color_mood: brand.color_mood,
    }

    const pack = await generateStrategyPack(brandData)

    const positioningStatement = Array.isArray(pack.positioning) ? pack.positioning[0] : null
    await sql`
      UPDATE user_personal_brand
      SET positioning_statement = ${positioningStatement},
          brand_strategy_pack = ${pack},
          brand_strategy_pack_updated_at = NOW(),
          updated_at = NOW()
      WHERE user_id = ${neonUser.id}
    `

    return Response.json({ cached: false, ...pack })
  } catch (error) {
    console.error("[v0] Error generating brand strategy pack:", error)
    return Response.json({ error: "Failed to generate brand strategy pack" }, { status: 500 })
  }
}
