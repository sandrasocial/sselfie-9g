import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-feature-flags"
import { sql } from "@/lib/db/client"

export async function GET() {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: 403 })
  }

  const [row] = await sql`
    WITH guide_buyers AS (
      SELECT
        LOWER(TRIM(u.email)) AS email,
        MIN(s.created_at) AS purchased_at
      FROM subscriptions s
      INNER JOIN users u
        ON u.id::varchar = s.user_id
      WHERE s.product_type IN ('selfie_guide', 'selfie_guide_bundle')
        AND s.status = 'active'
        AND u.email IS NOT NULL
        AND TRIM(u.email) <> ''
      GROUP BY LOWER(TRIM(u.email))
    ),
    buyer_progress AS (
      SELECT
        gb.email,
        gb.purchased_at,
        COALESCE(fs.guide_opened, false) AS guide_opened,
        COALESCE(fs.guide_chapter_index, 0) AS guide_chapter_index,
        fs.guide_completed_at,
        fs.guide_challenge_completed_at
      FROM guide_buyers gb
      LEFT JOIN freebie_subscribers fs
        ON LOWER(TRIM(fs.email)) = gb.email
    )
    SELECT
      COUNT(*)::int AS total_buyers,
      COUNT(*) FILTER (WHERE guide_opened)::int AS guide_opened_count,
      COUNT(*) FILTER (WHERE guide_chapter_index >= 1)::int AS chapter_1_reached,
      COUNT(*) FILTER (WHERE guide_chapter_index >= 2)::int AS chapter_2_reached,
      COUNT(*) FILTER (WHERE guide_chapter_index >= 3)::int AS chapter_3_reached,
      COUNT(*) FILTER (WHERE guide_chapter_index >= 4)::int AS chapter_4_reached,
      COUNT(*) FILTER (WHERE guide_chapter_index >= 5)::int AS chapter_5_reached,
      COUNT(*) FILTER (WHERE guide_chapter_index >= 6)::int AS chapter_6_reached,
      COUNT(*) FILTER (WHERE guide_chapter_index >= 7)::int AS chapter_7_reached,
      COUNT(*) FILTER (WHERE guide_chapter_index >= 8)::int AS chapter_8_reached,
      COUNT(*) FILTER (WHERE guide_completed_at IS NOT NULL)::int AS guide_completed_count,
      COUNT(*) FILTER (WHERE guide_challenge_completed_at IS NOT NULL)::int AS challenge_completed_count,
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1
          FROM subscriptions studio_subs
          INNER JOIN users studio_users
            ON studio_users.id::varchar = studio_subs.user_id
          WHERE LOWER(TRIM(studio_users.email)) = buyer_progress.email
            AND studio_subs.product_type IN ('sselfie_studio_membership', 'brand_studio_membership')
            AND studio_subs.status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid')
        )
      )::int AS studio_converted_count
    FROM buyer_progress
  `

  const totalBuyers = Number(row?.total_buyers || 0)
  const guideOpened = Number(row?.guide_opened_count || 0)
  const guideCompleted = Number(row?.guide_completed_count || 0)
  const challengeCompleted = Number(row?.challenge_completed_count || 0)
  const studioConverted = Number(row?.studio_converted_count || 0)

  const chapterCounts = [
    Number(row?.chapter_1_reached || 0),
    Number(row?.chapter_2_reached || 0),
    Number(row?.chapter_3_reached || 0),
    Number(row?.chapter_4_reached || 0),
    Number(row?.chapter_5_reached || 0),
    Number(row?.chapter_6_reached || 0),
    Number(row?.chapter_7_reached || 0),
    Number(row?.chapter_8_reached || 0),
  ]

  const chapterFunnel = chapterCounts.map((count, index) => ({
    chapter: index + 1,
    reached: count,
    dropOffFromPrevious: index === 0 ? 0 : Math.max(0, chapterCounts[index - 1] - count),
  }))

  const percentage = (value: number) => (totalBuyers > 0 ? Number(((value / totalBuyers) * 100).toFixed(1)) : 0)

  return NextResponse.json({
    totals: {
      buyers: totalBuyers,
      guideOpened,
      guideCompleted,
      challengeCompleted,
      studioConverted,
    },
    rates: {
      guideOpenRate: percentage(guideOpened),
      guideCompletionRate: percentage(guideCompleted),
      challengeCompletionRate: percentage(challengeCompleted),
      studioConversionRate: percentage(studioConverted),
    },
    chapterFunnel,
  })
}
