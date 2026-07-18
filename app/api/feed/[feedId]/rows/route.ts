import { NextResponse } from "next/server"

import { getAuthenticatedUser } from "@/lib/auth-helper"
import { sql } from "@/lib/db/client"
import { getUserByAuthId } from "@/lib/user-mapping"

const MAX_POSTS = 30

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ feedId: string }> | { feedId: string } }
) {
  const { user: authUser, error } = await getAuthenticatedUser()
  if (error || !authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const neonUser = await getUserByAuthId(authUser.id)
  if (!neonUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const { feedId } = await Promise.resolve(params)
  const feedIdNumber = Number(feedId)
  if (!Number.isInteger(feedIdNumber) || feedIdNumber <= 0) {
    return NextResponse.json({ error: "Invalid feed ID" }, { status: 400 })
  }

  try {
    const [, inserted] = await sql.transaction(tx => [
      tx`SELECT pg_advisory_xact_lock(hashtext(${`calendar-row:${neonUser.id}:${feedIdNumber}`}))`,
      tx`
        WITH owned_feed AS MATERIALIZED (
          SELECT id
          FROM feed_layouts
          WHERE id = ${feedIdNumber}
            AND user_id = ${neonUser.id}
          LIMIT 1
        ),
        post_state AS MATERIALIZED (
          SELECT COALESCE(MAX(position), 0)::integer AS max_position, COUNT(*)::integer AS post_count
          FROM feed_posts
          WHERE feed_layout_id = ${feedIdNumber}
            AND user_id = ${neonUser.id}
        )
        INSERT INTO feed_posts (
          feed_layout_id,
          user_id,
          position,
          post_type,
          generation_status,
          generation_mode,
          created_at,
          updated_at
        )
        SELECT
          owned_feed.id,
          ${neonUser.id},
          post_state.max_position + step,
          CASE (post_state.max_position + step) % 3
            WHEN 1 THEN 'selfie'
            WHEN 2 THEN 'flatlay'
            ELSE 'detail'
          END,
          'pending',
          'pro',
          NOW(),
          NOW()
        FROM owned_feed
        CROSS JOIN post_state
        CROSS JOIN generate_series(1, 3) AS step
        WHERE post_state.post_count <= ${MAX_POSTS - 3}
        RETURNING id, position
      `,
    ])

    const rows = inserted as Array<{ id: number; position: number }>
    if (rows.length === 0) {
      const [ownedFeed] = await sql`
        SELECT id FROM feed_layouts
        WHERE id = ${feedIdNumber} AND user_id = ${neonUser.id}
        LIMIT 1
      `
      if (!ownedFeed) return NextResponse.json({ error: "Feed not found" }, { status: 404 })
      return NextResponse.json(
        { error: "GRID_LIMIT_REACHED", details: "This grid already has 30 posts." },
        { status: 422 }
      )
    }

    return NextResponse.json({
      success: true,
      positionsCreated: rows.map(row => Number(row.position)),
    })
  } catch (rowError) {
    console.error("[calendar rows] add failed", rowError)
    return NextResponse.json({ error: "Could not add another row" }, { status: 500 })
  }
}
