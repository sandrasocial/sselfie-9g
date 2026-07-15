import { NextResponse } from "next/server"

import { getAuthenticatedUser } from "@/lib/auth-helper"
import { sql } from "@/lib/db/client"
import {
  deliveredMonthEnabled,
  hasDeliveredMonthAccess,
} from "@/lib/feed-planner/delivered-month"
import { currentPeriodMonth } from "@/lib/feed-planner/write-auto-draft"
import { getUserByAuthId } from "@/lib/user-mapping"

export const dynamic = "force-dynamic"

export async function GET() {
  // Cheap, database-free default: the dark release is invisible until Sandra enables it.
  if (!deliveredMonthEnabled()) {
    return NextResponse.json({ enabled: false })
  }

  const { user: authUser, error } = await getAuthenticatedUser()
  if (error || !authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await getUserByAuthId(authUser.id)
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })
  if (!(await hasDeliveredMonthAccess(user.id))) {
    return NextResponse.json({ enabled: false })
  }

  const periodMonth = currentPeriodMonth()
  const [post] = await sql`
    SELECT
      fp.id,
      fp.feed_layout_id,
      fp.caption,
      fp.content_pillar,
      fp.image_url,
      fp.scheduled_at,
      (fp.scheduled_at::date = CURRENT_DATE) AS is_today
    FROM feed_posts fp
    JOIN feed_layouts fl ON fl.id = fp.feed_layout_id
    WHERE fl.user_id = ${user.id}
      AND fl.period_month = ${periodMonth}
      AND fp.image_url IS NOT NULL
      AND fp.scheduled_at::date >= CURRENT_DATE
      AND COALESCE(fp.is_posted, FALSE) = FALSE
    ORDER BY
      CASE WHEN fp.scheduled_at::date = CURRENT_DATE THEN 0 ELSE 1 END,
      fp.scheduled_at ASC,
      fp.position ASC
    LIMIT 1
  `

  if (!post) return NextResponse.json({ enabled: true, post: null })

  return NextResponse.json({
    enabled: true,
    post: {
      id: Number(post.id),
      feedId: Number(post.feed_layout_id),
      caption: typeof post.caption === "string" ? post.caption : "",
      contentPillar: typeof post.content_pillar === "string" ? post.content_pillar : null,
      imageUrl: post.image_url,
      scheduledAt: new Date(post.scheduled_at).toISOString(),
      isToday: post.is_today === true,
    },
  })
}
