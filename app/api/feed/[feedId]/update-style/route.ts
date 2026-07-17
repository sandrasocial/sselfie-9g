import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getDb } from "@/lib/db/client"
import { withAuth } from "@/lib/auth/with-auth"
import {
  getFeedStyleV2ByName,
  getFeedStyleVariationById,
  getDefaultVariationId,
} from "@/lib/feed-planner/feed-style-prompt-loader"
import {
  normalizeInspirationImageUrl,
  normalizeVisualDirectionBrief,
  normalizeVisualDirectionMode,
} from "@/lib/feed-planner/visual-direction"

/**
 * Update Feed Style and Variation
 *
 * Updates an existing feed's feed_style and feed_style_variation_id
 */
async function handleUpdateFeedStyle(
  {
    request: req,
    user,
  }: {
    request: Request | NextRequest
    user: { id: string | number }
  },
  { params }: { params: Promise<{ feedId: string }> | { feedId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const feedId = resolvedParams.feedId
    const feedIdInt = Number.parseInt(feedId, 10)

    if (isNaN(feedIdInt)) {
      return NextResponse.json({ error: "Invalid feed ID" }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    let { feedStyle, feedStyleVariationId } = body
    const directionMode = normalizeVisualDirectionMode(
      body.directionMode ?? (feedStyle ? "curated" : "maya")
    )
    const visualDirectionBrief = normalizeVisualDirectionBrief(body.visualDirectionBrief)
    const inspirationImageUrl = normalizeInspirationImageUrl(body.inspirationImageUrl)

    if (directionMode === "curated" && !feedStyle) {
      return NextResponse.json(
        { error: "FEED_STYLE_REQUIRED", details: "Feed style is required." },
        { status: 422 }
      )
    }
    if (directionMode === "custom" && !visualDirectionBrief) {
      return NextResponse.json(
        {
          error: "VISUAL_DIRECTION_REQUIRED",
          details: "Describe the visual direction in a little more detail.",
        },
        { status: 422 }
      )
    }
    if (directionMode === "inspiration" && !inspirationImageUrl) {
      return NextResponse.json(
        { error: "INSPIRATION_REQUIRED", details: "Upload an inspiration image first." },
        { status: 422 }
      )
    }
    if (directionMode !== "curated") feedStyle = null

    const sql = getDb()

    // Verify feed ownership
    const [feed] = await sql`
      SELECT
        fl.id,
        fl.user_id,
        fl.feed_style,
        fl.feed_style_variation_id,
        upb.settings_preference,
        upb.visual_aesthetic,
        upb.fashion_style,
        upb.brand_vibe,
        upb.color_mood,
        upb.color_theme
      FROM feed_layouts fl
      LEFT JOIN LATERAL (
        SELECT settings_preference, visual_aesthetic, fashion_style, brand_vibe, color_mood, color_theme
        FROM user_personal_brand
        WHERE user_id = ${user.id}
        ORDER BY updated_at DESC
        LIMIT 1
      ) upb ON TRUE
      WHERE fl.id = ${feedIdInt}
      AND fl.user_id = ${user.id}
      LIMIT 1
    `

    if (!feed) {
      return NextResponse.json({ error: "Feed not found or unauthorized" }, { status: 404 })
    }

    if (directionMode === "custom" && visualDirectionBrief) {
      const { scoreFeedStyle } = await import("@/lib/feed-planner/resolve-feed-style")
      feedStyle = scoreFeedStyle(visualDirectionBrief)?.style ?? null
    }
    if (!feedStyle) {
      const { resolveFeedStyleForUser } = await import("@/lib/feed-planner/resolve-feed-style")
      const resolved = await resolveFeedStyleForUser(feed as Record<string, unknown>, user.id)
      feedStyle = resolved.feedStyle
      if (feedStyleVariationId === undefined) feedStyleVariationId = resolved.variationId
    }

    // Validate and resolve variation_id
    let feedStyleVariationIdToStore: number | null = null
    const style = await getFeedStyleV2ByName(feedStyle)
    if (!style) {
      return NextResponse.json(
        { error: "FEED_STYLE_NOT_READY", details: "Feed style is not available for V2." },
        { status: 422 }
      )
    }

    if (feedStyleVariationId !== undefined && feedStyleVariationId !== null) {
      const variation = await getFeedStyleVariationById(Number(feedStyleVariationId))
      if (!variation || !variation.enabled || variation.feed_style_id !== style.id) {
        return NextResponse.json(
          {
            error: "FEED_STYLE_VARIATION_INVALID",
            details: "Selected variation is not valid for this style.",
          },
          { status: 422 }
        )
      }
      feedStyleVariationIdToStore = variation.id
    } else {
      feedStyleVariationIdToStore = await getDefaultVariationId(style.id)
    }

    // Update feed_layouts
    await sql`
      UPDATE feed_layouts
      SET
        feed_style = ${feedStyle},
        feed_style_variation_id = ${feedStyleVariationIdToStore},
        visual_direction_mode = ${directionMode},
        visual_direction_brief = ${visualDirectionBrief},
        inspiration_image_url = ${inspirationImageUrl},
        updated_at = NOW()
      WHERE id = ${feedIdInt}
      AND user_id = ${user.id}
    `

    console.log(
      `[v0] Updated feed ${feedIdInt} style: ${feedStyle}, variation_id: ${feedStyleVariationIdToStore}`
    )

    // Keep Maya in sync with the picker: her chat context, scene templates, and next month's
    // auto-draft all follow preferred_feed_style - a modal pick and a "Maya, warmer vibes"
    // chat pick write the same key, latest wins. This route already applied the member's
    // exact variation, so skip the default-variation restyle.
    try {
      const { savePreferredFeedStyle } = await import("@/lib/feed-planner/resolve-feed-style")
      await savePreferredFeedStyle(user.id, feedStyle, { restyleCurrentMonth: false })
    } catch (syncError) {
      console.error("[update-style] preferred style sync skipped:", syncError)
    }

    return NextResponse.json({
      success: true,
      feedStyle,
      feedStyleVariationId: feedStyleVariationIdToStore,
      directionMode,
      visualDirectionBrief,
      inspirationImageUrl,
    })
  } catch (error: any) {
    console.error("[v0] Error updating feed style:", {
      message: error?.message || String(error),
      stack: error?.stack,
      code: error?.code,
    })

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error?.message || "Failed to update feed style",
      },
      { status: 500 }
    )
  }
}

export const PATCH = withAuth(handleUpdateFeedStyle, { authMode: "retry" })
