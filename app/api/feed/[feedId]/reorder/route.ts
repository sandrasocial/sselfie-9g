import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"


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
    const feedIdInt = Number.parseInt(feedId, 10)
    if (isNaN(feedIdInt)) {
      return NextResponse.json({ error: "Invalid feed ID format" }, { status: 400 })
    }

    const { postOrders } = await req.json()
    
    if (!Array.isArray(postOrders) || postOrders.length === 0) {
      return NextResponse.json(
        { error: "postOrders array is required" },
        { status: 400 }
      )
    }

    const normalizedOrders = postOrders.map(order => ({
      postId: Number(order?.postId),
      newPosition: Number(order?.newPosition),
    }))
    const postIds = normalizedOrders.map(order => order.postId)
    const positions = normalizedOrders.map(order => order.newPosition)

    const hasInvalidOrder = normalizedOrders.some(
      order =>
        !Number.isInteger(order.postId) ||
        !Number.isInteger(order.newPosition) ||
        order.postId < 1 ||
        order.newPosition < 1,
    )
    if (
      hasInvalidOrder ||
      new Set(postIds).size !== postIds.length ||
      new Set(positions).size !== positions.length
    ) {
      return NextResponse.json({ error: "Every post and position must be valid and unique" }, { status: 400 })
    }

    // Validate feed ownership and all requested rows before changing any position.
    const [feed] = await sql`
      SELECT id, user_id
      FROM feed_layouts
      WHERE id = ${feedIdInt} AND user_id = ${neonUser.id}
      LIMIT 1
    `
    
    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 })
    }

    const ownedPosts = await sql`
      SELECT id, position
      FROM feed_posts
      WHERE feed_layout_id = ${feedIdInt}
        AND user_id = ${neonUser.id}
    ` as Array<{ id: number; position: number }>
    const requestedIds = new Set(postIds)
    if (positions.some(position => position > ownedPosts.length)) {
      return NextResponse.json({ error: "A requested position is outside this grid" }, { status: 400 })
    }
    if (!postIds.every(id => ownedPosts.some(post => Number(post.id) === id))) {
      return NextResponse.json({ error: "One or more posts do not belong to this feed" }, { status: 400 })
    }
    if (
      positions.some(position =>
        ownedPosts.some(post => Number(post.position) === position && !requestedIds.has(Number(post.id))),
      )
    ) {
      return NextResponse.json({ error: "A requested position is occupied by another post" }, { status: 409 })
    }

    const orderJson = JSON.stringify(normalizedOrders.map(order => ({
      post_id: order.postId,
      new_position: order.newPosition,
    })))

    // The unique (feed_layout_id, position) index makes direct swaps unsafe. Stage every requested
    // row outside the visible range, then apply the final positions as a single transaction.
    await sql.transaction([
      sql`
        UPDATE feed_posts
        SET position = position + 100, updated_at = NOW()
        WHERE feed_layout_id = ${feedIdInt}
          AND user_id = ${neonUser.id}
          AND id = ANY(${postIds})
      `,
      sql`
        UPDATE feed_posts AS post
        SET position = requested.new_position, updated_at = NOW()
        FROM jsonb_to_recordset(${orderJson}::jsonb)
          AS requested(post_id bigint, new_position integer)
        WHERE post.id = requested.post_id
          AND post.feed_layout_id = ${feedIdInt}
          AND post.user_id = ${neonUser.id}
      `,
    ])

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
