import { NextResponse } from "next/server"

import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getUserPersonalBrand } from "@/lib/data/maya"
import { generateInstagramCaption } from "@/lib/feed-planner/caption-writer"

export const dynamic = "force-dynamic"
export const maxDuration = 30

const VALID_FORMATS = new Set([
  "photo",
  "photoshoot",
  "reel-cover",
  "carousel",
  "story-slide",
  "story-sequence",
])

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : ""
}

function contentPillars(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value !== "string") return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function POST(request: Request) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const neonUser = await getUserByAuthId(user.id)
  if (!neonUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const format = cleanText((body as Record<string, unknown>).format, 40)
  if (!VALID_FORMATS.has(format)) {
    return NextResponse.json({ error: "Unsupported format" }, { status: 400 })
  }

  const conceptTitle = cleanText((body as Record<string, unknown>).conceptTitle, 240)
  const conceptDescription = cleanText(
    (body as Record<string, unknown>).conceptDescription,
    600
  )
  const captionContext = cleanText((body as Record<string, unknown>).captionContext, 1200)
  const purpose = [conceptTitle, conceptDescription, captionContext].filter(Boolean).join(". ")

  try {
    const personalBrand = await getUserPersonalBrand(String(neonUser.id)).catch(() => null)
    const safeBrandProfile = personalBrand || {
      business_type: "Personal brand",
      brand_vibe: "Editorial and approachable",
      brand_voice: "Warm, direct and human",
      target_audience: "Her audience",
      content_pillars: [],
    }
    const result = await generateInstagramCaption({
      postPosition: 1,
      shotType: format,
      purpose: purpose || "a useful personal brand post",
      emotionalTone: "warm and confident",
      brandProfile: safeBrandProfile,
      targetAudience: safeBrandProfile.target_audience || "her audience",
      brandVoice: safeBrandProfile.brand_voice || "warm, direct and human",
      contentPillar: conceptTitle || "personal brand",
      valueConcept: captionContext || conceptDescription || conceptTitle || undefined,
      previousCaptions: [],
      captionType: "value",
      contentPillars: contentPillars(safeBrandProfile.content_pillars),
    })

    return NextResponse.json({ caption: result.caption?.trim() || null })
  } catch (error) {
    console.error("[maya-finish-post] caption generation failed:", error)
    return NextResponse.json({ error: "Maya could not finish the caption yet" }, { status: 502 })
  }
}
