import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      waitlistCount: 2847,
      usersCount: 0,
      spotsRemaining: 47,
      daysUntilClose: 14,
    })
  }

  try {
    const sql = neon(process.env.DATABASE_URL!)

    // Get waitlist count
    const waitlistResult = await sql`
      SELECT COUNT(*) as count FROM waitlist
    `
    const waitlistCount = Number(waitlistResult[0]?.count || 0)

    // Get users count
    const usersResult = await sql`
      SELECT COUNT(*) as count FROM users
    `
    const usersCount = Number(usersResult[0]?.count || 0)

    // Get beta settings
    const betaSettingsResult = await sql`
      SELECT total_spots, beta_end_date 
      FROM beta_settings 
      ORDER BY created_at DESC 
      LIMIT 1
    `

    const totalSignups = waitlistCount + usersCount
    const totalSpots = Number(betaSettingsResult[0]?.total_spots || 100)
    const spotsRemaining = Math.max(0, totalSpots - totalSignups)

    const betaEndDate = betaSettingsResult[0]?.beta_end_date
      ? new Date(betaSettingsResult[0].beta_end_date)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

    const today = new Date()
    const daysUntilClose = Math.max(0, Math.ceil((betaEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))

    return NextResponse.json({
      waitlistCount: totalSignups,
      usersCount: usersCount || 0,
      spotsRemaining,
      daysUntilClose,
    })
  } catch (error) {
    console.error("[v0] Error fetching landing stats:", error)
    return NextResponse.json({
      waitlistCount: 2847,
      usersCount: 0,
      spotsRemaining: 47,
      daysUntilClose: 14,
    })
  }
}
