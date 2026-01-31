import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"

const sql = neon(process.env.DATABASE_URL!)
const resend = new Resend(process.env.RESEND_API_KEY)
const ADMIN_EMAILS = ["ssa@ssasocial.com", "hello@sselfie.ai"]

export async function GET() {
  try {
    console.log("[v0] Notifications API: Fetching notifications")
    
    // Get unread feedback count
    const unreadFeedback = await sql`
      SELECT COUNT(*) as count
      FROM feedback
      WHERE status = 'open'
    `

    // Get beta program status (users who signed up in 2025 with studio membership)
    const betaUsers = await sql`
      SELECT COUNT(*) as count
      FROM users u
      INNER JOIN subscriptions s ON u.id = s.user_id::varchar
      WHERE s.product_type = 'sselfie_studio_membership'
        AND s.status = 'active'
        AND u.created_at >= '2025-01-01'
    `

    // Get recent critical bugs (last 24 hours)
    const criticalBugs = await sql`
      SELECT COUNT(*) as count
      FROM feedback
      WHERE type = 'bug'
        AND created_at > NOW() - INTERVAL '24 hours'
    `

    const webhookErrors = await sql`
      SELECT COUNT(*) as count
      FROM webhook_errors
      WHERE resolved = false
        AND created_at > NOW() - INTERVAL '24 hours'
    `.catch(() => [{ count: 0 }])

    const hasHealthIssues = parseInt(webhookErrors[0].count) > 0

    // Build notifications array
    const notifications = []

    // New feedback notifications
    if (parseInt(unreadFeedback[0].count) > 0) {
      notifications.push({
        id: "unread-feedback",
        type: "info",
        title: "New Feedback",
        message: `You have ${unreadFeedback[0].count} unread feedback items`,
        timestamp: new Date().toISOString(),
        link: "/admin/feedback",
      })
    }

    // Beta program notifications
    const betaCount = parseInt(betaUsers[0].count)
    if (betaCount >= 100) {
      notifications.push({
        id: "beta-limit",
        type: "warning",
        title: "Beta Limit Reached",
        message: "100/100 beta users. Consider disabling beta discount.",
        timestamp: new Date().toISOString(),
        link: "/admin/beta",
      })
    } else if (betaCount >= 90) {
      notifications.push({
        id: "beta-almost-full",
        type: "info",
        title: "Beta Program Almost Full",
        message: `${betaCount}/100 beta users enrolled`,
        timestamp: new Date().toISOString(),
        link: "/admin/beta",
      })
    }

    // Critical bug notifications
    if (parseInt(criticalBugs[0].count) > 0) {
      notifications.push({
        id: "critical-bugs",
        type: "error",
        title: "Critical Bugs Reported",
        message: `${criticalBugs[0].count} critical bugs in the last 24 hours`,
        timestamp: new Date().toISOString(),
        link: "/admin/feedback",
      })
    }

    // System health notifications
    if (hasHealthIssues) {
      notifications.push({
        id: "system-health",
        type: "error",
        title: "System Health Issue",
        message: `${webhookErrors[0].count} unresolved webhook errors`,
        timestamp: new Date().toISOString(),
        link: "/admin",
      })
    }

    const criticalNotifications = notifications.filter(n => n.type === "error" || (n.type === "warning" && n.id === "beta-limit"))
    
    // Check which alerts need to be sent (haven't been sent in last 6 hours)
    const ALERT_COOLDOWN_HOURS = 6
    const alertsToSend: typeof criticalNotifications = []
    
    for (const notif of criticalNotifications) {
      try {
        // Check if this alert was sent recently
        const recentAlert = await sql`
          SELECT sent_at 
          FROM admin_alert_sent 
          WHERE alert_id = ${notif.id}
            AND sent_at > NOW() - INTERVAL '6 hours'
          ORDER BY sent_at DESC
          LIMIT 1
        `
        
        if (recentAlert.length === 0) {
          // Alert hasn't been sent recently, add it to the send list
          alertsToSend.push(notif)
        } else {
          console.log(`[v0] Skipping ${notif.id} - already sent ${Math.round((Date.now() - new Date(recentAlert[0].sent_at).getTime()) / (1000 * 60 * 60))} hours ago`)
        }
      } catch (checkError) {
        // If table doesn't exist yet, log but don't fail - we'll still send the alert
        console.warn(`[v0] Could not check alert history for ${notif.id}:`, checkError)
        alertsToSend.push(notif)
      }
    }
    
    if (alertsToSend.length > 0) {
      console.log(`[v0] Sending email notifications for ${alertsToSend.length} new alert(s) to admin:`, ADMIN_EMAILS)
      
      // Send email to admin about critical issues
      for (const adminEmail of ADMIN_EMAILS) {
        try {
          await resend.emails.send({
            from: "sselfie Admin <hello@sselfie.ai>",
            to: adminEmail,
            subject: `[sselfie Admin] ${alertsToSend.length} Critical Alert${alertsToSend.length > 1 ? 's' : ''}`,
            tracking_opens: false,
            tracking_clicks: false,
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <style>
                    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1c1917; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #1c1917 0%, #57534e 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
                    .alert { background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 16px 0; border-radius: 8px; }
                    .warning { background: #fefce8; border-left: 4px solid #eab308; padding: 16px; margin: 16px 0; border-radius: 8px; }
                    .content { background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
                    .button { display: inline-block; background: #1c1917; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px; }
                    .footer { text-align: center; margin-top: 30px; color: #78716c; font-size: 14px; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1 style="margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 0.3em;">SSELFIE ADMIN</h1>
                      <p style="margin: 10px 0 0 0; font-size: 14px; letter-spacing: 0.2em; opacity: 0.9;">SYSTEM ALERT</p>
                    </div>
                    <div class="content">
                      <p>Hi Sandra,</p>
                      <p>You have ${alertsToSend.length} critical alert${alertsToSend.length > 1 ? 's' : ''} requiring your attention:</p>
                      
                      ${alertsToSend.map(notif => `
                        <div class="${notif.type === 'error' ? 'alert' : 'warning'}">
                          <strong>${notif.title}</strong>
                          <p style="margin: 8px 0 0 0;">${notif.message}</p>
                        </div>
                      `).join('')}
                      
                      <p>Please review these issues in your admin dashboard.</p>
                      
                      <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://sselfie.ai'}/admin" class="button">
                        View Admin Dashboard
                      </a>
                    </div>
                    <div class="footer">
                      <p>This is an automated notification from your sselfie admin system.</p>
                    </div>
                  </div>
                </body>
              </html>
            `,
          })
          console.log(`[v0] Email notification sent to ${adminEmail}`)
        } catch (emailError) {
          console.error(`[v0] Error sending email to ${adminEmail}:`, emailError)
        }
      }
      
      // Record that we sent these alerts
      for (const notif of alertsToSend) {
        try {
          await sql`
            INSERT INTO admin_alert_sent (alert_id, alert_type, alert_data)
            VALUES (${notif.id}, ${notif.type}, ${JSON.stringify(notif)})
          `
        } catch (recordError) {
          // If table doesn't exist yet, log but don't fail
          console.warn(`[v0] Could not record alert ${notif.id} in database:`, recordError)
        }
      }
    } else if (criticalNotifications.length > 0) {
      console.log(`[v0] ${criticalNotifications.length} critical alert(s) detected but all were sent recently (within ${ALERT_COOLDOWN_HOURS} hours)`)
    }

    return NextResponse.json({
      notifications,
      unreadCount: notifications.filter((n) => n.type === "error" || n.type === "warning").length,
    })
  } catch (error) {
    console.error("[v0] Error fetching notifications:", error)
    return NextResponse.json({ notifications: [], unreadCount: 0 }, { status: 200 })
  }
}
