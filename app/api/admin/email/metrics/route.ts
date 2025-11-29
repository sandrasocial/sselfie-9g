import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    // Calculate last 30 days date
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Count total emails sent in last 30 days
    const totalEmailsResult = await sql`
      SELECT COUNT(*) as count 
      FROM email_events 
      WHERE status = 'delivered' 
      AND created_at >= ${thirtyDaysAgo.toISOString()}
    `
    const totalEmails = Number(totalEmailsResult[0].count)

    // Count emails opened in last 30 days
    const openedEmailsResult = await sql`
      SELECT COUNT(*) as count 
      FROM email_events 
      WHERE status = 'opened' 
      AND created_at >= ${thirtyDaysAgo.toISOString()}
    `
    const openedEmails = Number(openedEmailsResult[0].count)

    // Count emails clicked in last 30 days
    const clickedEmailsResult = await sql`
      SELECT COUNT(*) as count 
      FROM email_events 
      WHERE status = 'clicked' 
      AND created_at >= ${thirtyDaysAgo.toISOString()}
    `
    const clickedEmails = Number(clickedEmailsResult[0].count)

    // Calculate rates
    const openRate = totalEmails > 0 ? Math.round((openedEmails / totalEmails) * 100) : 0
    const clickRate = totalEmails > 0 ? Math.round((clickedEmails / totalEmails) * 100) : 0

    // Count number of campaigns (unique sequence_ids)
    const campaignsResult = await sql`
      SELECT COUNT(DISTINCT sequence_id) as count 
      FROM email_events 
      WHERE created_at >= ${thirtyDaysAgo.toISOString()}
      AND sequence_id IS NOT NULL
    `
    const campaignsSent = Number(campaignsResult[0].count)

    // Top performing subject line (mock data for now as we don't store subjects in email_events)
    const topSubject = "Your Brand Blueprint is Ready"

    return NextResponse.json({
      openRate,
      clickRate,
      campaignsSent,
      topSubject,
    })
  } catch (error) {
    console.error("Error fetching email metrics:", error)
    return NextResponse.json({ error: "Failed to fetch email metrics" }, { status: 500 })
  }
}
