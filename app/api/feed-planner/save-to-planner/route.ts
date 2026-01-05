import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Save Feed to Planner
 * 
 * Updates an existing feed's status from 'chat' to 'saved' so it appears in Feed Planner screen.
 * This is an explicit user action - feeds generated in chat don't automatically appear in planner.
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[SAVE-TO-PLANNER] ==================== START ====================")

    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { feedId } = await request.json()

    if (!feedId || typeof feedId !== 'number') {
      return NextResponse.json({ error: "Feed ID is required" }, { status: 400 })
    }

    // Verify feed exists and belongs to user
    const [feed] = await sql`
      SELECT id, status, user_id
      FROM feed_layouts
      WHERE id = ${feedId} AND user_id = ${neonUser.id}
      LIMIT 1
    `

    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 })
    }

    // Update status to 'saved' so feed appears in Feed Planner
    await sql`
      UPDATE feed_layouts
      SET status = 'saved', updated_at = NOW()
      WHERE id = ${feedId} AND user_id = ${neonUser.id}
    `

    console.log("[SAVE-TO-PLANNER] ✅ Feed status updated to 'saved':", feedId)

    return NextResponse.json({
      success: true,
      feedId,
      message: "Feed saved to planner successfully",
    })
  } catch (error) {
    console.error("[SAVE-TO-PLANNER] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to save feed to planner",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}


