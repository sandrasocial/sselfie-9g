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

    const emailStats = await sql`
      SELECT 
        COUNT(*) as total_sent,
        COUNT(CASE WHEN status = 'delivered' OR status = 'sent' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'failed' OR status = 'error' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
      FROM email_logs
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `

    const recentEmails = await sql`
      SELECT 
        id,
        user_email,
        email_type,
        status,
        error_message,
        resend_message_id,
        sent_at,
        created_at
      FROM email_logs
      ORDER BY created_at DESC
      LIMIT 20
    `

    console.log("[v0] Email stats raw data:", emailStats[0])
    console.log("[v0] Recent emails count:", recentEmails.length)

    const totalSent = Number(emailStats[0]?.total_sent || 0)
    const delivered = Number(emailStats[0]?.delivered || 0)
    
    const deliveryRate = totalSent > 0 ? (delivered / totalSent) * 100 : 100

    console.log("[v0] Email metrics calculated:", { totalSent, delivered, deliveryRate })

    return NextResponse.json({
      stats: {
        totalSent,
        delivered,
        failed: Number(emailStats[0]?.failed || 0),
        pending: Number(emailStats[0]?.pending || 0),
        deliveryRate: Math.round(deliveryRate * 10) / 10,
      },
      recentEmails: recentEmails.map((email) => ({
        id: email.id,
        userEmail: email.user_email,
        emailType: email.email_type,
        status: email.status,
        errorMessage: email.error_message,
        resendMessageId: email.resend_message_id,
        sentAt: email.sent_at,
        createdAt: email.created_at,
      })),
    })
  } catch (error) {
    console.error("[v0] Error fetching email metrics:", error)
    return NextResponse.json({
      stats: {
        totalSent: 0,
        delivered: 0,
        failed: 0,
        pending: 0,
        deliveryRate: 100,
      },
      recentEmails: [],
    })
  }
}
