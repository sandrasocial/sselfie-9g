import { type NextRequest, NextResponse } from "next/server"
import { queueAllImagesForFeed } from "@/lib/feed-planner/queue-images"
import { withAuth } from "@/lib/auth/with-auth"

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
  try {
    console.log("[v0] ==================== QUEUE ALL IMAGES API CALLED ====================")

    const body = await request.json()
    const { feedLayoutId } = body

    if (!feedLayoutId) {
      return NextResponse.json({ error: "Feed layout ID is required" }, { status: 400 })
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "http://localhost:3000"

    try {
      const result = await queueAllImagesForFeed(feedLayoutId, authUser.id, origin)
      return NextResponse.json(result)
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
  }
}

export const POST = withAuth(handleQueueAllImages)
