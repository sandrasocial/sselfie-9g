import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ssa@ssasocial.com"

export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser || neonUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get feedback counts by type
    const feedbackStats = await sql`
      SELECT 
        COUNT(*) as total_feedback,
        COUNT(*) FILTER (WHERE status = 'new') as unread_count,
        COUNT(*) FILTER (WHERE type = 'bug') as bug_reports,
        COUNT(*) FILTER (WHERE type = 'feature') as feature_requests,
        COUNT(*) FILTER (WHERE type = 'testimonial') as testimonials,
        COUNT(*) FILTER (WHERE type = 'share_sselfies') as shared_sselfies
      FROM feedback
    `

    // Get recent feedback
    const recentFeedback = await sql`
      SELECT 
        id,
        user_email,
        type,
        subject,
        created_at,
        status
      FROM feedback
      ORDER BY created_at DESC
      LIMIT 10
    `

    return NextResponse.json({
      totalFeedback: Number(feedbackStats[0].total_feedback),
      unreadCount: Number(feedbackStats[0].unread_count),
      bugReports: Number(feedbackStats[0].bug_reports),
      featureRequests: Number(feedbackStats[0].feature_requests),
      testimonials: Number(feedbackStats[0].testimonials),
      sharedSSELFIEs: Number(feedbackStats[0].shared_sselfies),
      recentFeedback,
    })
  } catch (error) {
    console.error("[v0] Error fetching feedback dashboard data:", error)
    return NextResponse.json({ error: "Failed to fetch feedback data" }, { status: 500 })
  }
}
