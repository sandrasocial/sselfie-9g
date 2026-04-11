import { type NextRequest, NextResponse } from "next/server"
import { queueAllImagesForFeed } from "@/lib/feed-planner/queue-images"
import { withAuth } from "@/lib/auth/with-auth"
import { getUserByAuthId } from "@/lib/user-mapping"
import { generateAndStoreFeedCaptions } from "@/lib/feed-planner/generate-feed-captions"
import { sql } from "@/lib/db/client"

/**
 * Queue all images for a feed layout automatically
 * This endpoint is called after strategy creation to start generating all 9 images
 */
async function handleQueueAllImages({
  request,
  authUser,
}: {
  request: Request | NextRequest
  authUser: { id: string }
  user: { id: string | number }
}) {
  let advisoryLockKey: string | null = null
  let advisoryLockAcquired = false
  try {
    console.log("[v0] ==================== QUEUE ALL IMAGES API CALLED ====================")

    const body = await request.json()
    const { feedLayoutId } = body

    if (!feedLayoutId) {
      return NextResponse.json({ error: "Feed layout ID is required" }, { status: 400 })
    }
    const normalizedFeedLayoutId = Number(feedLayoutId)
    if (!Number.isFinite(normalizedFeedLayoutId) || normalizedFeedLayoutId <= 0) {
      return NextResponse.json({ error: "Invalid feed layout ID" }, { status: 400 })
    }
    const idempotencyKey = (request.headers.get("x-idempotency-key") || "").trim().slice(0, 120)

    const origin = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "http://localhost:3000"

    try {
      const neonUser = await getUserByAuthId(authUser.id)
      if (!neonUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      if (idempotencyKey) {
        advisoryLockKey = `feed-queue:${neonUser.id}:${normalizedFeedLayoutId}:${idempotencyKey}`
        const [lockResult] = await sql`
          SELECT pg_try_advisory_lock(hashtext(${advisoryLockKey})) AS locked
        `
        advisoryLockAcquired = Boolean(lockResult?.locked)
        if (!advisoryLockAcquired) {
          return NextResponse.json(
            {
              success: false,
              error: "Queue request already in progress for this key.",
              retryable: true,
            },
            { status: 409 },
          )
        }
      }

      // Generate weak/missing captions before image queueing so default "Generate Feed"
      // always produces story-led caption quality.
      const captionResult = await generateAndStoreFeedCaptions({
        feedId: normalizedFeedLayoutId,
        userId: neonUser.id,
        mode: "missing_or_weak",
      })

      const result = await queueAllImagesForFeed(normalizedFeedLayoutId, authUser.id, origin)
      return NextResponse.json({
        ...result,
        captionGeneration: {
          targetedPosts: captionResult.targetedPosts,
          captionsGenerated: captionResult.captionsGenerated,
          captionsFailed: captionResult.captionsFailed,
          captionsSkipped: captionResult.captionsSkipped,
        },
      })
    } catch (error) {
      console.error("[v0] Queue all images error:", error)
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to queue images",
          details: error instanceof Error ? error.stack : undefined,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("[v0] Queue all images error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to queue images",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  } finally {
    if (advisoryLockAcquired && advisoryLockKey) {
      try {
        await sql`SELECT pg_advisory_unlock(hashtext(${advisoryLockKey}))`
      } catch (unlockError) {
        console.warn("[v0] Queue all images unlock failed:", unlockError)
      }
    }
  }
}

export const POST = withAuth(handleQueueAllImages)
