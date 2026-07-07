// SSELFIE Studio 3.0 - Feed Planner Phase 2c: Maya places a chat-generated photo onto the
// calendar. Called from the "Add to calendar" action on a generated photo's result card
// (components/app-v3/concept-card.tsx). No day-picker UI - Maya picks the slot herself:
// the earliest open day in the current month's plan, or a freshly appended day if the month
// is already full. Always leaves the slot with a real, copy-paste-ready caption.

import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { sql } from "@/lib/db/client"
import { currentPeriodMonth } from "@/lib/feed-planner/write-auto-draft"
import { generateInstagramCaption } from "@/lib/feed-planner/caption-writer"
import { getFeedPlannerAccess } from "@/lib/feed-planner/access-control"
import { resolveFeedStyleForUser } from "@/lib/feed-planner/resolve-feed-style"
import { getUserPersonalBrand } from "@/lib/data/maya"
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
    // Same entitlement that gates the Calendar tab itself - a limited/free session must not
    // be able to create calendar rows it can't see. 403 tells the card to hide the action.
    const access = await getFeedPlannerAccess(user.id)
    if (!access.isMembership && !access.isPaidBlueprint) {
      return NextResponse.json({ error: "Calendar not included in this plan" }, { status: 403 })
    }

    const periodMonth = currentPeriodMonth()

    // Prefer this month's auto-drafted plan; fall back to the user's latest plan of any month
    // so the action still works for an account whose plan predates period_month.
    const [layout] =
      (await sql`
        SELECT id, feed_style FROM feed_layouts
        WHERE user_id = ${neonUser.id} AND period_month = ${periodMonth}
        LIMIT 1
      `.catch(() => [])) as any[]

    let feedLayout =
      layout ||
      (
        await sql`
          SELECT id, feed_style FROM feed_layouts
          WHERE user_id = ${neonUser.id}
          ORDER BY created_at DESC
          LIMIT 1
        `
      )[0]

    // No plan at all yet (she generated a photo before ever opening Calendar): create a
    // month stub instead of dead-ending. strategic_rationale stays NULL - that marks it as a
    // stub, so the auto-draft route knows it may still fill this month in around her photo.
    if (!feedLayout) {
      const personalBrand = await getUserPersonalBrand(neonUser.id).catch(() => null)
      const style = await resolveFeedStyleForUser(personalBrand, neonUser.id)
      const [stub] = await sql`
        INSERT INTO feed_layouts (
          user_id, title, layout_type, status, feed_style, feed_style_variation_id, period_month
        ) VALUES (
          ${neonUser.id}, ${`Feed plan - ${periodMonth}`}, 'grid_3x3', 'draft',
          ${style.feedStyle}, ${style.variationId}, ${periodMonth}
        )
        RETURNING id, feed_style
      `
      feedLayout = stub
    }

    const feedLayoutId = Number(feedLayout.id)

    // Only today or future days count as open - never quietly fill a day that already passed.
    // GRID DESIGN INTEGRITY (2026-07-07): chat photos carry her face, so they land on PERSON
    // slots only - flatlay/detail slots are face-free object scenes by the curated grid's
    // design (generated on the calendar tile) and a portrait dropped there would collapse
    // the planned look into wall-to-wall faces.
    const [openSlot] = await sql`
      SELECT id, position, scheduled_at, content_pillar, caption
      FROM feed_posts
      WHERE feed_layout_id = ${feedLayoutId} AND image_url IS NULL AND scheduled_at >= CURRENT_DATE
        AND COALESCE(post_type, 'selfie') NOT IN ('flatlay', 'detail')
      ORDER BY scheduled_at ASC, position ASC
      LIMIT 1
    `

    let targetPostId: number
    let targetPosition: number
    let scheduledAt: string
    let contentPillar: string | null
    let caption: string | null

    if (openSlot) {
      targetPostId = Number(openSlot.id)
      targetPosition = Number(openSlot.position)
      scheduledAt = new Date(openSlot.scheduled_at).toISOString().slice(0, 10)
      contentPillar = openSlot.content_pillar
      caption = openSlot.caption
    } else {
      // No open future day - extend the plan by one day past the latest scheduled post, but
      // never into the past (a stub or an old plan may have its latest post days ago).
      const [latest] = await sql`
        SELECT MAX(position) AS max_position, MAX(scheduled_at) AS max_date
        FROM feed_posts
        WHERE feed_layout_id = ${feedLayoutId}
      `
      const nextPosition = Number(latest?.max_position || 0) + 1
      const today = new Date().toISOString().slice(0, 10)
      const dayAfterLatest = latest?.max_date ? addDays(latest.max_date, 1) : today
      scheduledAt = dayAfterLatest > today ? dayAfterLatest : today
      targetPosition = nextPosition
      contentPillar = typeof conceptTitle === "string" && conceptTitle.trim() ? conceptTitle.trim() : "From your chat"
      caption = null

      // The photo being placed comes from chat, so it IS a person shot - the new day is
      // 'selfie' regardless of what the grid pattern would put at this position (the pattern
      // governs pre-planned slots, not an extension day created for an existing photo).
      const [inserted] = await sql`
        INSERT INTO feed_posts (feed_layout_id, user_id, position, post_type, content_pillar, scheduled_at, generation_status)
        VALUES (${feedLayoutId}, ${neonUser.id}, ${nextPosition}, ${'selfie'}, ${contentPillar}, ${scheduledAt}, 'pending')
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

    return NextResponse.json({ position: targetPosition, scheduledAt, caption })
  } catch (error) {
    console.error("[place-photo] failed:", error)
    return NextResponse.json({ error: "Failed to save to calendar" }, { status: 500 })
  }
}
