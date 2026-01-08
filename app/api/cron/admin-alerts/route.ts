import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { checkMarginAlerts, wasAlertSentRecently, recordAlertSent } from "@/lib/admin/alerts"
import { sendEmail } from "@/lib/email/send-email"
import {
  calculateTotalRevenue,
  calculateMRR,
  calculateCreditCost,
  calculateReferralBonusCost,
  calculateGrossMargin,
  estimateClaudeCostPerActiveUser,
} from "@/lib/admin/metrics"

const sql = neon(process.env.DATABASE_URL!)

const ADMIN_EMAILS = ["ssa@ssasocial.com", "hello@sselfie.ai"]

/**
 * GET /api/cron/admin-alerts
 * 
 * Daily cron job to check margin thresholds and send email alerts
 * Runs at 7 AM UTC
 * 
 * Protected with CRON_SECRET verification
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error("[v0] [CRON] CRON_SECRET not configured")
      return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error("[v0] [CRON] Unauthorized admin-alerts cron request")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] [CRON] Starting margin alert check...")

    // Get current metrics for summary
    const totalRevenue = await calculateTotalRevenue()
    const mrr = await calculateMRR()
    const creditCost = await calculateCreditCost()
    const referralBonusCost = await calculateReferralBonusCost()
    const avgClaudeCost = await estimateClaudeCostPerActiveUser()

    const [userStats] = await sql`
      SELECT COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '30 days')::int as active_users
      FROM users
      WHERE email IS NOT NULL
    `
    const activeUsers = userStats?.active_users || 0
    const totalClaudeCost = activeUsers * avgClaudeCost
    const totalCosts = creditCost + referralBonusCost + totalClaudeCost
    const grossMargin = calculateGrossMargin(totalRevenue, totalCosts)

    const [referralStats] = await sql`
      SELECT 
        COUNT(*)::int as total_referrals,
        COUNT(*) FILTER (WHERE status = 'completed')::int as completed_referrals
      FROM referrals
    `
    const totalReferrals = referralStats?.total_referrals || 0
    const completedReferrals = referralStats?.completed_referrals || 0
    const referralConversionRate = totalReferrals > 0 ? (completedReferrals / totalReferrals) * 100 : 0

    // Check for alerts
    const alerts = await checkMarginAlerts()

    if (alerts.length === 0) {
      console.log("[v0] [CRON] No margin alerts detected")
      return NextResponse.json({
        success: true,
        alertsSent: 0,
        message: "No alerts to send",
      })
    }

    // Check if alert summary was sent today
    const alertId = "margin-alert-summary"
    const wasSent = await wasAlertSentRecently(alertId, 24) // 24-hour cooldown

    if (wasSent) {
      console.log("[v0] [CRON] Alert summary already sent today (cooldown active)")
      return NextResponse.json({
        success: true,
        alertsSent: 0,
        message: "Alert summary in cooldown period",
      })
    }

    // Build alert summary
    const alertSummary = alerts.map((alert) => {
      const value = alert.type === "margin"
        ? `${alert.currentValue.toFixed(1)}%`
        : alert.type === "claude"
          ? `$${alert.currentValue.toFixed(2)}`
          : `${alert.currentValue.toFixed(1)}%`
      const threshold = alert.type === "margin"
        ? `${alert.threshold}%`
        : alert.type === "claude"
          ? `$${alert.threshold}`
          : `${alert.threshold}%`
      return `- ${alert.type === "margin" ? "Gross Margin" : alert.type === "claude" ? "Claude Cost" : "Referral Conversion"}: ${value} (${alert.level === "critical" ? "above" : "below"} ${threshold})`
    }).join("\n")

    const recommendedActions = alerts
      .map((alert) => {
        if (alert.type === "margin") return "- Review referral bonuses and Claude usage"
        if (alert.type === "claude") return "- Review referral bonuses and Claude usage"
        if (alert.type === "referral") return "- Review referral bonuses and Claude usage"
        return ""
      })
      .filter((action) => action)
      .join("\n")

    // Send summary email
    try {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
              .alert-box { background: white; padding: 15px; border-left: 4px solid #f59e0b; margin: 15px 0; }
              .dashboard-link { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #1c1917; color: white; text-decoration: none; border-radius: 8px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2 style="margin: 0;">⚠️ SSELFIE Margin Alert</h2>
              </div>
              <div class="content">
                <h3>Alert Summary:</h3>
                <div class="alert-box">
                  <pre style="white-space: pre-wrap; font-family: inherit; margin: 0;">${alertSummary}</pre>
                </div>
                <h3>Recommended actions:</h3>
                <div class="alert-box">
                  <pre style="white-space: pre-wrap; font-family: inherit; margin: 0;">${recommendedActions || "- No specific actions recommended"}</pre>
                </div>
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"}/admin/growth-dashboard" class="dashboard-link">
                  View Growth Dashboard →
                </a>
              </div>
            </div>
          </body>
        </html>
      `

      const text = `
⚠️ SSELFIE Margin Alert

Alert Summary:
${alertSummary}

Recommended actions:
${recommendedActions || "- No specific actions recommended"}

View dashboard: ${process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"}/admin/growth-dashboard
      `

      // Send to all admin emails
      for (const adminEmail of ADMIN_EMAILS) {
        await sendEmail({
          to: adminEmail,
          subject: "⚠️ SSELFIE Margin Alert",
          html,
          text,
          from: "SSelfie Growth Alerts <hello@sselfie.ai>",
          emailType: "admin-alert",
        })
      }

      // Record that alert was sent
      await recordAlertSent(alertId)

      // Log to alerts (non-blocking)
      try {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/logs/alerts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            alerts,
            timestamp: new Date().toISOString(),
          }),
        }).catch(() => {
          // Ignore logging errors
        })
      } catch (logError) {
        // Ignore logging errors
      }

      console.log(`[v0] [CRON] ✅ Alert summary sent: ${alerts.length} alert(s)`)

      return NextResponse.json({
        success: true,
        alertsSent: 1,
        totalAlerts: alerts.length,
        alerts: alerts.map((a) => ({
          type: a.type,
          level: a.level,
          message: a.message,
        })),
      })
    } catch (error: any) {
      console.error(`[v0] [CRON] ❌ Failed to send alert summary:`, error.message)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to send alerts" },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("[v0] [CRON] Error in admin alerts cron:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check alerts" },
      { status: 500 },
    )
  }
}
