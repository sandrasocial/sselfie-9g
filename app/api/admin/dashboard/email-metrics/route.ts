import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const ADMIN_EMAIL = "ssa@ssasocial.com"

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

    const sql = neon(process.env.DATABASE_URL!)

    // Get email delivery statistics (last 24 hours)
    const emailStats = await sql`
      SELECT 
        COUNT(*) as total_sent,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN retry_count > 0 THEN 1 END) as retried
      FROM email_logs
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `

    // Get recent email logs
    const recentEmails = await sql`
      SELECT 
        id,
        recipient,
        subject,
        status,
        retry_count,
        error_message,
        resend_message_id,
        created_at
      FROM email_logs
      ORDER BY created_at DESC
      LIMIT 20
    `

    // Get email trends (last 7 days)
    const emailTrends = await sql`
      SELECT 
        DATE_TRUNC('day', created_at) as day,
        COUNT(*) as total_sent,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM email_logs
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY day DESC
    `

    const totalSent = Number(emailStats[0]?.total_sent || 0)
    const delivered = Number(emailStats[0]?.delivered || 0)
    const deliveryRate = totalSent > 0 ? (delivered / totalSent) * 100 : 100

    return NextResponse.json({
      stats: {
        totalSent,
        delivered,
        failed: Number(emailStats[0]?.failed || 0),
        pending: Number(emailStats[0]?.pending || 0),
        retried: Number(emailStats[0]?.retried || 0),
        deliveryRate: Math.round(deliveryRate * 10) / 10,
      },
      recentEmails: recentEmails.map((email) => ({
        id: email.id,
        recipient: email.recipient,
        subject: email.subject,
        status: email.status,
        retryCount: email.retry_count,
        errorMessage: email.error_message,
        resendMessageId: email.resend_message_id,
        createdAt: email.created_at,
      })),
      emailTrends: emailTrends.map((trend) => ({
        day: trend.day,
        totalSent: Number(trend.total_sent),
        delivered: Number(trend.delivered),
        failed: Number(trend.failed),
      })),
    })
  } catch (error) {
    console.error("[v0] Error fetching email metrics:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
