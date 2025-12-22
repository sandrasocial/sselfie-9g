import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { queueAllImagesForFeed } from "@/lib/feed-planner/queue-images"

/**
 * Queue all images for a feed layout automatically
 * This endpoint is called after strategy creation to start generating all 9 images
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[v0] ==================== QUEUE ALL IMAGES API CALLED ====================")

    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      console.log("[v0] No auth user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { feedLayoutId } = body

    if (!feedLayoutId) {
      return NextResponse.json({ error: "Feed layout ID is required" }, { status: 400 })
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "http://localhost:3000"
    
    try {
      const result = await queueAllImagesForFeed(feedLayoutId, authUser.id, origin)
      return NextResponse.json(result)
    } catch (error: any) {
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
































