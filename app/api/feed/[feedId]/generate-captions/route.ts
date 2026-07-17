import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { generateAndStoreFeedCaptions } from "@/lib/feed-planner/generate-feed-captions"

export const maxDuration = 300 // 5 minutes for generating 9 captions

/**
 * Generate captions for all posts in a feed
 * Saves captions directly to database
 * Returns success message with caption count
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ feedId: string }> | { feedId: string } }
) {
  try {
    const { feedId } = await Promise.resolve(params)
    console.log("[GENERATE-CAPTIONS] Generating captions for feed:", feedId)

    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Verify feed belongs to user
    const [feed] = await sql`
      SELECT * FROM feed_layouts
      WHERE id = ${feedId}
      AND user_id = ${neonUser.id}
    `

    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 })
    }
    const body = await request.json().catch(() => ({}))
    const mode = body?.mode === "missing_or_weak" ? "missing_or_weak" : "all"
    const result = await generateAndStoreFeedCaptions({
      feedId,
      userId: neonUser.id,
      mode,
    })

    console.log(
      `[GENERATE-CAPTIONS] ✅ Generated ${result.captionsGenerated}/${result.targetedPosts} targeted captions` +
        `${result.captionsFailed > 0 ? ` (${result.captionsFailed} failed)` : ""}`
    )

    return NextResponse.json({
      success: true,
      feedId: parseInt(feedId),
      captionsGenerated: result.captionsGenerated,
      captionsFailed: result.captionsFailed,
      captionsNeedStory: result.captionsNeedStory,
      captionsSkipped: result.captionsSkipped,
      needsStoryPostIds: result.needsStoryPostIds,
      targetedPosts: result.targetedPosts,
      totalPosts: result.totalPosts,
      message:
        result.targetedPosts === 0
          ? "All captions already meet quality standards."
          : `Successfully generated ${result.captionsGenerated} captions` +
            `${result.captionsNeedStory > 0 ? ` (${result.captionsNeedStory} need your story)` : ""}` +
            `${result.captionsFailed > 0 ? ` (${result.captionsFailed} failed)` : ""}`,
    })
  } catch (error) {
    console.error("[GENERATE-CAPTIONS] Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate captions",
      },
      { status: 500 }
    )
  }
}
