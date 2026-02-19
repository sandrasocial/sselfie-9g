import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"
import { getAcademyJourneyState } from "@/lib/onboarding/academy-journey"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  const { user: authUser, error } = await getAuthenticatedUser()
  if (error || !authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const neonUser = await getEffectiveNeonUser(authUser.id)
  if (!neonUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const userId = neonUser.id

  const [aiImageCountRows, generatedImageCountRows, contentPlanRows, lastActivityRows] = await Promise.all([
    sql`
      SELECT COUNT(*)::int AS count
      FROM ai_images
      WHERE user_id = ${userId}
        AND generation_status = 'completed'
    `,
    sql`
      SELECT COUNT(*)::int AS count
      FROM generated_images
      WHERE user_id = ${userId}
        AND status = 'completed'
    `,
    sql`
      SELECT COUNT(*)::int AS count
      FROM feed_posts
      WHERE user_id = ${userId}
    `,
    sql`
      SELECT
        EXTRACT(EPOCH FROM (NOW() - MAX(activity_at))) / 3600.0 AS hours_since
      FROM (
        SELECT MAX(created_at) AS activity_at FROM ai_images WHERE user_id = ${userId}
        UNION ALL
        SELECT MAX(created_at) AS activity_at FROM generated_images WHERE user_id = ${userId}
        UNION ALL
        SELECT MAX(updated_at) AS activity_at FROM feed_posts WHERE user_id = ${userId}
      ) activity
      WHERE activity_at IS NOT NULL
    `,
  ])

  const generationCount =
    Number(aiImageCountRows[0]?.count || 0) + Number(generatedImageCountRows[0]?.count || 0)
  const hasContentPlan = Number(contentPlanRows[0]?.count || 0) > 0
  const hoursSinceLastActive =
    lastActivityRows[0]?.hours_since == null ? null : Number(lastActivityRows[0]?.hours_since)

  const journeyState = getAcademyJourneyState({
    generationCount,
    hasContentPlan,
    hoursSinceLastActive,
  })

  return NextResponse.json({
    generationCount,
    hasContentPlan,
    hoursSinceLastActive,
    ...journeyState,
  })
}
