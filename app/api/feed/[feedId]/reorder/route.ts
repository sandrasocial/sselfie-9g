import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ feedId: string }> | { feedId: string } }
) {
  try {
    // Authenticate user
    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Resolve params (handle both Promise and direct object)
    const resolvedParams = await Promise.resolve(params)
    const feedId = resolvedParams.feedId

    const { postOrders } = await req.json()
    
    if (!postOrders || !Array.isArray(postOrders)) {
      return NextResponse.json(
        { error: "postOrders array is required" },
        { status: 400 }
      )
    }

    // Validate feed ownership
    const [feed] = await sql`
      SELECT id, user_id
      FROM feed_layouts
      WHERE id = ${feedId} AND user_id = ${neonUser.id}
      LIMIT 1
    `
    
    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 })
    }
    
    // Update positions in database
    for (const { postId, newPosition } of postOrders) {
      if (!postId || !newPosition || newPosition < 1 || newPosition > 9) {
        console.error("[v0] [REORDER] Invalid post order:", { postId, newPosition })
        continue
      }
      
      await sql`
        UPDATE feed_posts
        SET position = ${newPosition}, updated_at = NOW()
        WHERE id = ${postId} 
          AND feed_layout_id = ${feedId}
          AND user_id = ${neonUser.id}
      `
    }
    
    console.log(`[v0] [REORDER] Successfully reordered ${postOrders.length} posts for feed ${feedId}`)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] [REORDER] Error:", error)
    return NextResponse.json(
      { error: "Failed to reorder posts" },
      { status: 500 }
    )
  }
}

