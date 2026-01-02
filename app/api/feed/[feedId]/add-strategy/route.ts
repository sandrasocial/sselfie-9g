import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Add a generated strategy to a feed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ feedId: string }> | { feedId: string } }
) {
  try {
    const { feedId } = await Promise.resolve(params)
    const body = await request.json()
    const { strategy } = body

    if (!strategy) {
      return NextResponse.json(
        { error: "strategy is required" },
        { status: 400 }
      )
    }

    console.log("[ADD-STRATEGY] Adding strategy to feed:", feedId)

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
      SELECT id
      FROM feed_layouts
      WHERE id = ${feedId}
      AND user_id = ${neonUser.id}
    `

    if (!feed) {
      return NextResponse.json(
        { error: "Feed not found or access denied" },
        { status: 404 }
      )
    }

    // Update feed description with strategy (store in description field)
    // Note: We're storing the strategy in the description field since it's the most appropriate field
    // for storing a strategy document. If there's a dedicated strategy field, we can update this.
    await sql`
      UPDATE feed_layouts
      SET description = ${strategy},
          updated_at = NOW()
      WHERE id = ${feedId}
      AND user_id = ${neonUser.id}
    `

    console.log("[ADD-STRATEGY] ✅ Strategy added to feed:", feedId)

    return NextResponse.json({
      success: true,
      message: "Strategy added successfully",
    })
  } catch (error) {
    console.error("[ADD-STRATEGY] Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to add strategy",
      },
      { status: 500 }
    )
  }
}

