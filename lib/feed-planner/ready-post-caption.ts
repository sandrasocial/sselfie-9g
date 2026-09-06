import { getMayaWritingContext } from "@/lib/app-v3/maya/writing-context"
import { sql } from "@/lib/db/client"
import { generateInstagramCaption } from "@/lib/feed-planner/caption-writer"

export interface CalendarCaptionPost {
  id: number
  feed_layout_id: number
  position?: number | null
  post_type?: string | null
  content_pillar?: string | null
  caption?: string | null
  image_context?: string | null
}

export type CalendarCaptionOutcome = {
  caption: string | null
  status: "ready" | "preserved" | "unavailable"
}

function hasCaption(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function normalizeContentPillars(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value !== "string") return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Creates the caption half of a ready post without touching an existing member caption.
 * Failures are deliberately non-blocking: a saved/generated photo must never be lost because
 * the text provider was temporarily unavailable.
 */
export async function draftReadyPostCaption(input: {
  userId: string | number
  post: CalendarCaptionPost
}): Promise<CalendarCaptionOutcome> {
  if (hasCaption(input.post.caption)) {
    return { caption: input.post.caption, status: "preserved" }
  }

  try {
    const [brandProfiles, previousCaptions] = await Promise.all([
      sql`
        SELECT brand_voice, brand_vibe, business_type, target_audience, content_pillars
        FROM user_personal_brand
        WHERE user_id = ${input.userId} AND is_completed = true
        LIMIT 1
      `,
      sql`
        SELECT position, caption
        FROM feed_posts
        WHERE feed_layout_id = ${input.post.feed_layout_id}
          AND user_id = ${input.userId}
          AND id <> ${input.post.id}
          AND caption IS NOT NULL
          AND BTRIM(caption) <> ''
        ORDER BY position ASC
        LIMIT 8
      `,
    ])
    const [brandProfile] = brandProfiles

    const safeBrandProfile = brandProfile || {
      business_type: "Personal brand",
      brand_vibe: "Editorial and approachable",
      brand_voice: "Warm, direct and human",
      target_audience: "Her audience",
      content_pillars: [],
    }
    const result = await generateInstagramCaption({
      ...(await getMayaWritingContext(null, String(input.userId))),
      postPosition: Number(input.post.position) || 1,
      shotType: input.post.post_type || "photo",
      purpose: input.post.content_pillar || "personal brand story",
      emotionalTone: "warm and confident",
      brandProfile: safeBrandProfile,
      targetAudience: safeBrandProfile.target_audience || "her audience",
      brandVoice: safeBrandProfile.brand_voice || "warm, direct and human",
      contentPillar: input.post.content_pillar || "personal brand",
      previousCaptions: Array.isArray(previousCaptions)
        ? previousCaptions.map(item => ({
            position: Number(item.position) || 1,
            caption: typeof item.caption === "string" ? item.caption : undefined,
          }))
        : [],
      // A photo alone is not evidence of a personal story. Draft useful brand value
      // automatically; Maya asks for a real moment before writing autobiography.
      captionType: "value",
      contentPillars: normalizeContentPillars(safeBrandProfile.content_pillars),
      imageContext: input.post.image_context || null,
    })
    const caption = hasCaption(result.caption) ? result.caption.trim() : null
    return caption ? { caption, status: "ready" } : { caption: null, status: "unavailable" }
  } catch (error) {
    console.error("[ready-post-caption] Caption draft failed; preserving photo flow:", error)
    return { caption: null, status: "unavailable" }
  }
}

/** Adds a missing caption after Calendar image generation, guarded against overwriting edits. */
export async function ensureReadyPostCaption(input: {
  userId: string | number
  post: CalendarCaptionPost
}): Promise<CalendarCaptionOutcome> {
  const outcome = await draftReadyPostCaption(input)
  if (outcome.status !== "ready" || !outcome.caption) return outcome

  try {
    const [updated] = await sql`
      UPDATE feed_posts
      SET caption = CASE
            WHEN caption IS NULL OR BTRIM(caption) = '' THEN ${outcome.caption}
            ELSE caption
          END,
          updated_at = NOW()
      WHERE id = ${input.post.id}
        AND user_id = ${input.userId}
      RETURNING caption
    `

    if (hasCaption(updated?.caption) && updated.caption !== outcome.caption) {
      return { caption: updated.caption, status: "preserved" }
    }
    return { caption: updated?.caption || outcome.caption, status: "ready" }
  } catch (error) {
    console.error("[ready-post-caption] Caption save failed; preserving photo flow:", error)
    return { caption: null, status: "unavailable" }
  }
}
