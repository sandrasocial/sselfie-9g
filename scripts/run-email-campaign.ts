/**
 * Script to run email campaign directly (server-side)
 * 
 * This bypasses the API authentication by calling the campaign executor directly
 * 
 * Usage:
 *   pnpm exec tsx scripts/run-email-campaign.ts --campaignId 3 --mode live
 */

import { config } from "dotenv"
import { resolve } from "path"
import { neon } from "@neondatabase/serverless"

// Load environment variables FIRST before any other imports
config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

if (!process.env.DATABASE_URL) {
  console.error("❌ Error: DATABASE_URL environment variable is required")
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL!)

async function runCampaign() {
  // Parse command line arguments
  const args = process.argv.slice(2)
  let campaignId: number | undefined
  let mode: "live" | "test" = "test"

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--campaignId" && args[i + 1]) {
      campaignId = parseInt(args[i + 1])
      i++
    } else if (args[i].startsWith("--campaignId=")) {
      campaignId = parseInt(args[i].split("=")[1])
    } else if (args[i] === "--mode" && args[i + 1]) {
      mode = args[i + 1] as "live" | "test"
      i++
    } else if (args[i].startsWith("--mode=")) {
      mode = args[i].split("=")[1] as "live" | "test"
    }
  }

  if (!campaignId) {
    console.error("❌ Error: --campaignId is required")
    console.log("\nUsage:")
    console.log("  pnpm exec tsx scripts/run-email-campaign.ts --campaignId 3 --mode live")
    process.exit(1)
  }

  if (mode !== "live" && mode !== "test") {
    console.error("❌ Error: --mode must be 'live' or 'test'")
    process.exit(1)
  }

  console.log("\n🚀 RUNNING EMAIL CAMPAIGN")
  console.log("=" .repeat(50))
  console.log(`Campaign ID: ${campaignId}`)
  console.log(`Mode: ${mode.toUpperCase()}`)
  console.log(`Time: ${new Date().toISOString()}\n`)

  // Verify campaign exists
  const campaign = await sql`
    SELECT id, campaign_name, campaign_type, status, target_audience
    FROM admin_email_campaigns
    WHERE id = ${campaignId}
  `

  if (!campaign || campaign.length === 0) {
    console.error(`❌ Campaign ID ${campaignId} not found`)
    process.exit(1)
  }

  const campaignData = campaign[0]
  console.log(`✓ Found campaign: "${campaignData.campaign_name}"`)
  console.log(`  Type: ${campaignData.campaign_type}`)
  console.log(`  Status: ${campaignData.status}\n`)

  // If campaign is draft, update to scheduled
  if (campaignData.status === "draft") {
    console.log("📝 Campaign is in 'draft' status. Updating to 'scheduled'...")
    await sql`
      UPDATE admin_email_campaigns
      SET status = 'scheduled', scheduled_for = NOW(), updated_at = NOW()
      WHERE id = ${campaignId}
    `
    console.log("✓ Campaign status updated to 'scheduled'\n")
  }

  if (mode === "live") {
    console.log("⚠️  WARNING: LIVE MODE - This will send to ALL subscribers!")
    console.log("   Press Ctrl+C within 5 seconds to cancel...\n")
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }

  try {
    console.log("📧 Executing campaign...\n")

    // Import the module dynamically after env vars are loaded
    const { runScheduledCampaigns } = await import("@/lib/email/run-scheduled-campaigns")

    const results = await runScheduledCampaigns({
      mode,
      campaignId: Number(campaignId),
    })

    if (results.length === 0) {
      console.log("⚠️  No campaigns processed")
      console.log("   This might mean:")
      console.log("   - Campaign is not in 'scheduled' status")
      console.log("   - Campaign scheduled_for date is in the future")
      console.log("   - No recipients found in target_audience")
      process.exit(0)
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("📊 CAMPAIGN RESULTS")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

    for (const result of results) {
      console.log(`Campaign: ${result.campaignName}`)
      console.log(`  Type: ${result.campaignType}`)
      console.log(`  Template: ${result.templateUsed || "N/A"}`)
      console.log(`  Recipients:`)
      console.log(`    Total: ${result.recipients.total}`)
      console.log(`    Sent: ${result.recipients.sent}`)
      console.log(`    Failed: ${result.recipients.failed}`)

      if (result.errors.length > 0) {
        console.log(`  Errors: ${result.errors.length}`)
        result.errors.slice(0, 5).forEach((error, i) => {
          console.log(`    ${i + 1}. ${error}`)
        })
        if (result.errors.length > 5) {
          console.log(`    ... and ${result.errors.length - 5} more`)
        }
      }

      if (mode === "test" && result.recipients.testEmail) {
        console.log(`  Test Email: ${result.recipients.testEmail}`)
      }

      console.log()
    }

    const summary = {
      totalCampaigns: results.length,
      totalSent: results.reduce((sum, r) => sum + r.recipients.sent, 0),
      totalFailed: results.reduce((sum, r) => sum + r.recipients.failed, 0),
      totalRecipients: results.reduce((sum, r) => sum + r.recipients.total, 0),
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("📈 SUMMARY")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log(`Total Campaigns: ${summary.totalCampaigns}`)
    console.log(`Total Recipients: ${summary.totalRecipients}`)
    console.log(`Total Sent: ${summary.totalSent}`)
    console.log(`Total Failed: ${summary.totalFailed}`)
    console.log(`Success Rate: ${summary.totalRecipients > 0 ? ((summary.totalSent / summary.totalRecipients) * 100).toFixed(1) : 0}%`)
    console.log()

    if (mode === "live") {
      console.log("✅ LIVE CAMPAIGN COMPLETED")
      console.log(`   ${summary.totalSent} emails sent to subscribers`)
      console.log(`   Check Resend dashboard: https://resend.com/emails`)
      console.log(`   Check email_logs table for delivery status`)
    } else {
      console.log("✅ TEST CAMPAIGN COMPLETED")
      console.log(`   Test email sent to admin address`)
    }

    console.log()
  } catch (error: any) {
    console.error("\n❌ ERROR RUNNING CAMPAIGN:")
    console.error(error.message)
    console.error(error)
    process.exit(1)
  }
}

runCampaign().catch((error) => {
  console.error("❌ Script failed:", error)
  process.exit(1)
})
