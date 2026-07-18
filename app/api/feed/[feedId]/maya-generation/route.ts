import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { sql } from "@/lib/db/client"
import { getUserByAuthId } from "@/lib/user-mapping"

type CalendarGenerationAction = "start" | "fail"

function validRequestId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9:_-]{8,160}$/.test(value)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ feedId: string }> | { feedId: string } }
) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const user = await getUserByAuthId(authUser.id)
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const resolvedParams = await Promise.resolve(params)
    const feedId = Number(resolvedParams.feedId)
    const body = (await request.json().catch(() => null)) as {
      postId?: unknown
      requestId?: unknown
      action?: CalendarGenerationAction
    } | null
    const postId = Number(body?.postId)
    const action = body?.action
    if (
      !Number.isInteger(feedId) ||
      feedId <= 0 ||
      !Number.isInteger(postId) ||
      postId <= 0 ||
      !validRequestId(body?.requestId) ||
      (action !== "start" && action !== "fail")
    ) {
      return NextResponse.json({ error: "Invalid Calendar generation request" }, { status: 400 })
    }

    const [feed] = await sql`
      SELECT id, user_id
      FROM feed_layouts
      WHERE id = ${feedId}
      LIMIT 1
    `
    if (!feed) return NextResponse.json({ error: "Feed not found" }, { status: 404 })
    if (Number(feed.user_id) !== Number(user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const generationRef = `maya:${body.requestId}`
    if (action === "start") {
      const [updated] = await sql`
        UPDATE feed_posts
        SET generation_status = 'generating',
            prediction_id = ${generationRef},
            updated_at = NOW()
        WHERE id = ${postId}
          AND feed_layout_id = ${feedId}
          AND user_id = ${user.id}
          AND image_url IS NULL
          AND (
            prediction_id IS NULL
            OR prediction_id = ${generationRef}
            OR generation_status = 'failed'
          )
        RETURNING id, position, generation_status, prediction_id
      `
      if (updated) {
        return NextResponse.json({ success: true, post: updated })
      }
    } else {
      const [updated] = await sql`
        UPDATE feed_posts
        SET generation_status = 'failed',
            prediction_id = NULL,
            updated_at = NOW()
        WHERE id = ${postId}
          AND feed_layout_id = ${feedId}
          AND user_id = ${user.id}
          AND image_url IS NULL
          AND prediction_id = ${generationRef}
        RETURNING id, position, generation_status, prediction_id
      `
      if (updated) {
        return NextResponse.json({ success: true, post: updated })
      }
    }

    const [post] = await sql`
      SELECT id, image_url, generation_status, prediction_id
      FROM feed_posts
      WHERE id = ${postId}
        AND feed_layout_id = ${feedId}
        AND user_id = ${user.id}
      LIMIT 1
    `
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 })
    if (action === "fail") {
      // A stale failure must never overwrite a newer request or a finished post.
      return NextResponse.json({ success: true, stale: true, post })
    }
    return NextResponse.json(
      {
        error: post.image_url
          ? "This post already has a photo"
          : "Maya is already creating this post",
      },
      { status: 409 }
    )
  } catch (error) {
    console.error("[calendar-maya-generation] failed", error)
    return NextResponse.json({ error: "Could not update this Calendar post" }, { status: 500 })
  }
}
