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

    // Get webhook error statistics (last 24 hours)
    const errorStats = await sql`
      SELECT 
        COUNT(*) as total_errors,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_errors,
        COUNT(CASE WHEN severity = 'warning' THEN 1 END) as warning_errors,
        COUNT(CASE WHEN is_resolved = true THEN 1 END) as resolved_errors
      FROM webhook_errors
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `

    // Get recent webhook errors
    const recentErrors = await sql`
      SELECT 
        id,
        event_type,
        error_message,
        severity,
        is_resolved,
        created_at,
        metadata
      FROM webhook_errors
      ORDER BY created_at DESC
      LIMIT 20
    `

    // Get error trends (last 7 days)
    const errorTrends = await sql`
      SELECT 
        DATE_TRUNC('day', created_at) as day,
        COUNT(*) as error_count,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_count
      FROM webhook_errors
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY day DESC
    `

    // Get success rate (from subscriptions table)
    const webhookSuccess = await sql`
      SELECT 
        COUNT(*) as total_webhooks,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as successful_webhooks
      FROM subscriptions
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `

    const totalWebhooks = Number(webhookSuccess[0]?.total_webhooks || 0)
    const successfulWebhooks = Number(webhookSuccess[0]?.successful_webhooks || 0)
    const successRate = totalWebhooks > 0 ? (successfulWebhooks / totalWebhooks) * 100 : 100

    return NextResponse.json({
      stats: {
        totalErrors: Number(errorStats[0]?.total_errors || 0),
        criticalErrors: Number(errorStats[0]?.critical_errors || 0),
        warningErrors: Number(errorStats[0]?.warning_errors || 0),
        resolvedErrors: Number(errorStats[0]?.resolved_errors || 0),
        successRate: Math.round(successRate * 10) / 10,
        totalWebhooks,
      },
      recentErrors: recentErrors.map((error) => ({
        id: error.id,
        eventType: error.event_type,
        errorMessage: error.error_message,
        severity: error.severity,
        isResolved: error.is_resolved,
        createdAt: error.created_at,
        metadata: error.metadata,
      })),
      errorTrends: errorTrends.map((trend) => ({
        day: trend.day,
        errorCount: Number(trend.error_count),
        criticalCount: Number(trend.critical_count),
      })),
    })
  } catch (error) {
    console.error("[v0] Error fetching webhook health:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
