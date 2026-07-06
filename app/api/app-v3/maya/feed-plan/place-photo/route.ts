// SSELFIE Studio 3.0 - Feed Planner Phase 2c: Maya places a chat-generated photo onto the
// calendar. Called from the "Add to calendar" action on a generated photo's result card
// (components/app-v3/concept-card.tsx). No day-picker UI - Maya picks the slot herself:
// the earliest open day in the current month's plan, or a freshly appended day if the month
// is already full. Always leaves the slot with a real, copy-paste-ready caption.

import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { sql } from "@/lib/db/client"
import { currentPeriodMonth, postTypeForPosition } from "@/lib/feed-planner/write-auto-draft"
import { generateInstagramCaption } from "@/lib/feed-planner/caption-writer"
import { CURATED_FEED_STYLE_MAP, type CuratedFeedStyleName } from "@/lib/style-presets"

export const dynamic = "force-dynamic"
export const maxDuration = 30

// The neon driver returns DATE columns as JS Date objects, not strings - accept either so a
// value read straight off a query result (Date) and a plain "YYYY-MM-DD" (string) both work.
function addDays(date: string | Date, days: number): string {
  const d = typeof date === "string" ? new Date(`${date}T00:00:00Z`) : new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export async function POST(req: Request) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const neonUser = await getUserByAuthId(user.id)
  if (!neonUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const { imageUrl, aiImageId, conceptTitle } = await req.json()
  if (typeof imageUrl !== "string" || !imageUrl.trim()) {
    return NextResponse.json({ error: "imageUrl is required" }, { status: 400 })
  }

  try {
    const periodMonth = currentPeriodMonth()

    // Prefer this month's auto-drafted plan; fall back to the user's latest plan of any month
    // so the action still works for an account whose plan predates period_month.
    const [layout] =
      (await sql`
        SELECT id, feed_style FROM feed_layouts
        WHERE user_id = ${neonUser.id} AND period_month = ${periodMonth}
        LIMIT 1
      `.catch(() => [])) as any[]

    const feedLayout =
      layout ||
      (
        await sql`
          SELECT id, feed_style FROM feed_layouts
          WHERE user_id = ${neonUser.id}
          ORDER BY created_at DESC
          LIMIT 1
        `
      )[0]

    if (!feedLayout) {
      return NextResponse.json({ error: "No feed plan found for this account" }, { status: 404 })
    }

    const feedLayoutId = Number(feedLayout.id)

    const [openSlot] = await sql`
      SELECT id, position, scheduled_at, content_pillar, caption
      FROM feed_posts
      WHERE feed_layout_id = ${feedLayoutId} AND image_url IS NULL
      ORDER BY scheduled_at ASC NULLS LAST, position ASC
      LIMIT 1
    `

    let targetPostId: number
    let scheduledAt: string
    let contentPillar: string | null
    let caption: string | null

    if (openSlot) {
      targetPostId = Number(openSlot.id)
      scheduledAt = new Date(openSlot.scheduled_at).toISOString().slice(0, 10)
      contentPillar = openSlot.content_pillar
      caption = openSlot.caption
    } else {
      // Month's full - extend it by one day past the latest scheduled post (or today, if the
      // plan somehow has none), rather than failing the action.
      const [latest] = await sql`
        SELECT MAX(position) AS max_position, MAX(scheduled_at) AS max_date
        FROM feed_posts
        WHERE feed_layout_id = ${feedLayoutId}
      `
      const nextPosition = Number(latest?.max_position || 0) + 1
      scheduledAt = latest?.max_date ? addDays(latest.max_date, 1) : new Date().toISOString().slice(0, 10)
      contentPillar = typeof conceptTitle === "string" && conceptTitle.trim() ? conceptTitle.trim() : "From your chat"
      caption = null

      const feedStyle = (feedLayout.feed_style as CuratedFeedStyleName) || "Dark & Moody"
      const grid = CURATED_FEED_STYLE_MAP[feedStyle]?.grid || CURATED_FEED_STYLE_MAP["Dark & Moody"].grid
      const postType = postTypeForPosition(grid, nextPosition)

      const [inserted] = await sql`
        INSERT INTO feed_posts (feed_layout_id, user_id, position, post_type, content_pillar, scheduled_at, generation_status)
        VALUES (${feedLayoutId}, ${neonUser.id}, ${nextPosition}, ${postType}, ${contentPillar}, ${scheduledAt}, 'pending')
        RETURNING id
      `
      targetPostId = Number(inserted.id)
    }

    // Copy-paste ready is the whole point - if this slot has no caption yet, write one now.
    if (!caption || !caption.trim()) {
      try {
        const [brandProfile] = await sql`
          SELECT brand_voice, brand_vibe, business_type, target_audience, content_pillars
          FROM user_personal_brand
          WHERE user_id = ${neonUser.id} AND is_completed = true
          LIMIT 1
        `
        const captionResult = await generateInstagramCaption({
          postPosition: 1,
          shotType: "portrait",
          purpose: contentPillar || "general",
          emotionalTone: "confident",
          captionType: "story",
          contentPillars: [],
          brandProfile: (brandProfile as any) || {
            business_type: "Personal Brand",
            brand_vibe: "Strategic",
            brand_voice: "Authentic",
            target_audience: "Her audience",
          },
          targetAudience: brandProfile?.target_audience || "her audience",
          brandVoice: brandProfile?.brand_voice || "authentic",
          contentPillar: contentPillar || "lifestyle",
          previousCaptions: [],
        })
        caption = captionResult.caption || ""
      } catch (captionError) {
        console.error("[place-photo] caption generation failed, saving without one:", captionError)
        caption = caption || ""
      }
    }

    await sql`
      UPDATE feed_posts
      SET image_url = ${imageUrl}, ai_image_id = ${aiImageId ?? null}, generation_status = 'completed',
          caption = ${caption}
      WHERE id = ${targetPostId}
    `

    return NextResponse.json({ position: (openSlot?.position ?? null), scheduledAt, caption })
  } catch (error) {
    console.error("[place-photo] failed:", error)
    return NextResponse.json({ error: "Failed to save to calendar" }, { status: 500 })
  }
}
