import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { resolve } from "path"

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), ".env.local") })
dotenv.config({ path: resolve(process.cwd(), ".env") })

const sql = neon(process.env.DATABASE_URL!)

async function diagnoseEmailAnalytics() {
  console.log("\n🔍 DIAGNOSING EMAIL ANALYTICS\n")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

  try {
    // Get all campaigns
    const campaigns = await sql`
      SELECT 
        id,
        campaign_name,
        campaign_type,
        status,
        total_recipients,
        total_sent,
        total_failed,
        sent_at,
        created_at
      FROM admin_email_campaigns
      ORDER BY created_at DESC
      LIMIT 10
    `

    console.log(`Found ${campaigns.length} campaigns\n`)

    for (const campaign of campaigns) {
      console.log(`📧 Campaign: ${campaign.campaign_name}`)
      console.log(`   ID: ${campaign.id}`)
      console.log(`   Status: ${campaign.status}`)
      console.log(`   admin_email_campaigns.total_sent: ${campaign.total_sent || 0}`)
      console.log(`   admin_email_campaigns.total_recipients: ${campaign.total_recipients || 0}`)
      console.log(`   admin_email_campaigns.total_failed: ${campaign.total_failed || 0}`)
      console.log("")

      // Check email_logs for this campaign
      const emailLogs = await sql`
        SELECT 
          COUNT(*) as total_logs,
          COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_count,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_count,
          COUNT(CASE WHEN opened = true THEN 1 END) as opened_count,
          COUNT(CASE WHEN clicked = true THEN 1 END) as clicked_count,
          COUNT(CASE WHEN converted = true THEN 1 END) as converted_count,
          COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as has_opened_at,
          COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as has_clicked_at
        FROM email_logs
        WHERE campaign_id = ${campaign.id}
      `

      const logs = emailLogs[0]
      console.log(`   email_logs entries: ${logs.total_logs}`)
      console.log(`   email_logs sent: ${logs.sent_count}`)
      console.log(`   email_logs delivered: ${logs.delivered_count}`)
      console.log(`   email_logs opened: ${logs.opened_count}`)
      console.log(`   email_logs clicked: ${logs.clicked_count}`)
      console.log(`   email_logs converted: ${logs.converted_count}`)
      console.log(`   Has opened_at timestamp: ${logs.has_opened_at}`)
      console.log(`   Has clicked_at timestamp: ${logs.has_clicked_at}`)
      console.log("")

      // Check for potential issues
      const issues: string[] = []

      if (campaign.total_sent && Number(campaign.total_sent) > 0 && Number(logs.total_logs) === 0) {
        issues.push("⚠️  Emails were sent but not logged in email_logs (missing campaign_id?)")
      }

      if (Number(logs.sent_count) > 0 && Number(logs.opened_count) === 0 && Number(logs.has_opened_at) === 0) {
        issues.push("⚠️  Emails sent but no opens tracked (webhook may not be working)")
      }

      if (Number(logs.opened_count) > 0 && Number(logs.clicked_count) === 0 && Number(logs.has_clicked_at) === 0) {
        issues.push("⚠️  Emails opened but no clicks tracked (webhook may not be working)")
      }

      if (campaign.status === "sending" && Number(logs.sent_count) > 0) {
        issues.push("⚠️  Campaign status is 'sending' but emails are already logged as sent")
      }

      if (issues.length > 0) {
        console.log("   Issues found:")
        issues.forEach(issue => console.log(`   ${issue}`))
        console.log("")
      }

      // Show sample email log entries
      if (Number(logs.total_logs) > 0) {
        const sampleLogs = await sql`
          SELECT 
            id,
            user_email,
            email_type,
            status,
            opened,
            clicked,
            converted,
            opened_at,
            clicked_at,
            converted_at,
            sent_at,
            campaign_id
          FROM email_logs
          WHERE campaign_id = ${campaign.id}
          ORDER BY sent_at DESC
          LIMIT 3
        `

        console.log(`   Sample email_logs entries (${sampleLogs.length}):`)
        sampleLogs.forEach((log: any, index: number) => {
          console.log(`   ${index + 1}. Email: ${log.user_email}`)
          console.log(`      Status: ${log.status}`)
          console.log(`      Opened: ${log.opened} ${log.opened_at ? `(${new Date(log.opened_at).toISOString()})` : ''}`)
          console.log(`      Clicked: ${log.clicked} ${log.clicked_at ? `(${new Date(log.clicked_at).toISOString()})` : ''}`)
          console.log(`      Converted: ${log.converted} ${log.converted_at ? `(${new Date(log.converted_at).toISOString()})` : ''}`)
          console.log(`      Sent at: ${log.sent_at ? new Date(log.sent_at).toISOString() : 'null'}`)
        })
        console.log("")
      }

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
    }

    // Check webhook configuration
    console.log("\n🔧 WEBHOOK CONFIGURATION CHECK\n")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
    
    const recentLogs = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN opened = true THEN 1 END) as opened,
        COUNT(CASE WHEN clicked = true THEN 1 END) as clicked,
        COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as has_opened_at,
        COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as has_clicked_at,
        MAX(sent_at) as last_sent
      FROM email_logs
      WHERE sent_at >= NOW() - INTERVAL '7 days'
    `

    const recent = recentLogs[0]
    console.log(`Last 7 days:`)
    console.log(`  Total emails: ${recent.total}`)
    console.log(`  Opened (boolean): ${recent.opened}`)
    console.log(`  Clicked (boolean): ${recent.clicked}`)
    console.log(`  Has opened_at timestamp: ${recent.has_opened_at}`)
    console.log(`  Has clicked_at timestamp: ${recent.has_clicked_at}`)
    console.log(`  Last sent: ${recent.last_sent ? new Date(recent.last_sent).toISOString() : 'none'}`)
    console.log("")

    if (Number(recent.total) > 0 && Number(recent.has_opened_at) === 0) {
      console.log("⚠️  WARNING: Emails sent but no opened_at timestamps found!")
      console.log("   This suggests the Resend webhook may not be configured or working.")
      console.log("   Check: app/api/webhooks/resend/route.ts")
      console.log("   Verify RESEND_WEBHOOK_SECRET is set in Vercel")
      console.log("")
    }

    // Check for emails without campaign_id
    const emailsWithoutCampaign = await sql`
      SELECT COUNT(*) as count
      FROM email_logs
      WHERE campaign_id IS NULL
      AND sent_at >= NOW() - INTERVAL '30 days'
    `

    console.log(`Emails without campaign_id (last 30 days): ${emailsWithoutCampaign[0].count}`)
    if (Number(emailsWithoutCampaign[0].count) > 0) {
      console.log("⚠️  Some emails are not linked to campaigns - they won't show in analytics")
    }

    console.log("\n✅ Diagnosis complete\n")

  } catch (error) {
    console.error("❌ Error diagnosing email analytics:", error)
    process.exit(1)
  }
}

diagnoseEmailAnalytics()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error("❌ Fatal error:", error)
    process.exit(1)
  })
