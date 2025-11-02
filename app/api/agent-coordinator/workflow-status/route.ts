import { type NextRequest, NextResponse } from "next/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const feedId = searchParams.get("feedId")

    if (!feedId) {
      return NextResponse.json({ error: "Feed ID required" }, { status: 400 })
    }

    // Check feed generation status
    const [feed] = await sql`
      SELECT 
        fl.*,
        (SELECT COUNT(*) FROM feed_posts WHERE feed_layout_id = fl.id) as posts_count,
        (SELECT COUNT(*) FROM feed_posts WHERE feed_layout_id = fl.id AND generation_status = 'completed') as completed_posts
      FROM feed_layouts fl
      WHERE fl.id = ${feedId} AND fl.user_id = ${user.id}
    `

    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 })
    }

    // Determine current step based on what's completed
    let currentStep = "content_research"
    let progress = 0

    if (feed.posts_count === 0) {
      currentStep = "content_research"
      progress = 30
    } else if (feed.posts_count === 9 && feed.completed_posts === 0) {
      currentStep = "image_generation"
      progress = 80
    } else if (feed.completed_posts === 9) {
      currentStep = "image_generation"
      progress = 100
    }

    return NextResponse.json({
      currentStep,
      progress,
      postsCount: feed.posts_count,
      completedPosts: feed.completed_posts,
      isComplete: feed.completed_posts === 9,
    })
  } catch (error) {
    console.error("[v0] [WORKFLOW STATUS] Error:", error)
    return NextResponse.json({ error: "Failed to get workflow status" }, { status: 500 })
  }
}
