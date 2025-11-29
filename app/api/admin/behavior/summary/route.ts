import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    // Calculate last 7 days date
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Most common action last 7 days
    const commonActionResult = await sql`
      SELECT event_type, COUNT(*) as count
      FROM user_events
      WHERE created_at >= ${sevenDaysAgo.toISOString()}
      GROUP BY event_type
      ORDER BY count DESC
      LIMIT 1
    `
    const mostCommonAction = commonActionResult[0]?.event_type || "blueprint_generated"

    // User with highest engagement score
    const topUserResult = await sql`
      SELECT email, engagement_score
      FROM blueprint_subscribers
      ORDER BY engagement_score DESC NULLS LAST
      LIMIT 1
    `
    const topUser = topUserResult[0]?.email || "No users yet"
    const topScore = topUserResult[0]?.engagement_score || 0

    // Total blueprint completions
    const completionsResult = await sql`
      SELECT COUNT(*) as count
      FROM blueprint_subscribers
      WHERE blueprint_completed = true
    `
    const totalCompletions = Number(completionsResult[0].count)

    // Photoshoots generated this week
    const photoshootsResult = await sql`
      SELECT COUNT(*) as count
      FROM user_events
      WHERE event_type = 'photoshoot_generated'
      AND created_at >= ${sevenDaysAgo.toISOString()}
    `
    const photoshoots = Number(photoshootsResult[0].count)

    return NextResponse.json({
      mostCommonAction,
      topUser: `${topUser} (${topScore} pts)`,
      totalCompletions,
      photoshoots,
    })
  } catch (error) {
    console.error("Error fetching behavior summary:", error)
    return NextResponse.json({ error: "Failed to fetch behavior summary" }, { status: 500 })
  }
}
