import type { NextRequest } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getDb } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)

    if (!user || user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      caption,
      scheduled_at,
      scheduled_time,
      content_pillar,
      post_type = "single",
      timezone = "UTC",
      image_url = null,
      prompt = null,
      target_user_id = null,
    } = body

    if (!caption || !scheduled_at) {
      return Response.json({ error: "Caption and scheduled_at are required" }, { status: 400 })
    }

    // Use target_user_id if provided (for creating calendars for specific users)
    const postUserId = target_user_id || user.id

    const sql = getDb()

    // Create the calendar post entry
    const [post] = await sql`
      INSERT INTO feed_posts (
        user_id,
        caption,
        scheduled_at,
        scheduled_time,
        content_pillar,
        post_type,
        post_status,
        timezone,
        image_url,
        prompt,
        generation_status,
        created_at,
        updated_at
      ) VALUES (
        ${postUserId},
        ${caption},
        ${scheduled_at}::timestamptz,
        ${scheduled_time},
        ${content_pillar || "education"},
        ${post_type},
        'draft',
        ${timezone},
        ${image_url},
        ${prompt},
        ${image_url ? "completed" : "pending"},
        NOW(),
        NOW()
      )
      RETURNING *
    `

    return Response.json({
      success: true,
      post,
      message: "Calendar post created successfully",
    })
  } catch (error: any) {
    console.error("[v0] Error creating calendar post:", error)
    return Response.json(
      {
        error: "Failed to create calendar post",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
