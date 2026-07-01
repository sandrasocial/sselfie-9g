import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { sql } from "@/lib/db/client"
import { generateInstagramCaption, extractHashtagsFromCaption } from "@/lib/feed-planner/caption-writer"

export const maxDuration = 60

/**
 * POST /api/maya/generate-caption
 *
 * Generates a single, ready-to-post Instagram caption using the user's brand
 * profile and the quality rules from the caption writer (word count, anti-AI
 * patterns, hashtag limits).
 *
 * Body: { topic?: string }  - optional 1-sentence context from Maya's [GENERATE_CAPTIONS] marker
 * Returns: { caption: string, hashtags: string[] }
 */
export async function POST(req: Request) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    const topic: string = body.topic || "personal branding"

    // Load brand profile from Neon - SELECT * avoids errors if optional columns don't exist yet
    const [brandProfile] = await sql`
      SELECT *
      FROM user_personal_brand
      WHERE user_id = ${neonUser.id}
      LIMIT 1
    `

    const safeBrandProfile = brandProfile || {
      business_type: "Personal Brand",
      brand_vibe: "Authentic",
      brand_voice: "warm and real",
      target_audience: "women building personal brands",
    }

    console.log(`[generate-caption] Generating caption for user ${neonUser.id}, topic: "${topic}"`)

    const { caption } = await generateInstagramCaption({
      postPosition: 1,
      shotType: "lifestyle",
      purpose: topic,
      emotionalTone: "warm",
      brandProfile: safeBrandProfile,
      targetAudience: safeBrandProfile.target_audience || "general audience",
      brandVoice: safeBrandProfile.brand_voice || "authentic",
      captionType: "story",
    })

    // Split caption body from hashtag block for structured response
    const lines = caption.split("\n\n")
    const lastBlock = (lines[lines.length - 1] || "").trim()
    const isHashtagBlock = lastBlock.startsWith("#")
    const captionBody = isHashtagBlock ? lines.slice(0, -1).join("\n\n").trim() : caption
    const hashtags = isHashtagBlock
      ? extractHashtagsFromCaption(lastBlock)
      : extractHashtagsFromCaption(caption)

    console.log(`[generate-caption] Done - ${captionBody.split(/\s+/).length} words, ${hashtags.length} hashtags`)

    return NextResponse.json({ caption: captionBody, hashtags })
  } catch (error) {
    console.error("[generate-caption] Error:", error)
    return NextResponse.json({ error: "Failed to generate caption" }, { status: 500 })
  }
}
