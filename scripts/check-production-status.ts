import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { resolve } from "path"

// Load .env.local
dotenv.config({ path: resolve(process.cwd(), ".env.local") })

const sql = neon(process.env.DATABASE_URL!)

async function checkProductionStatus() {
  console.log("\n=== PRODUCTION STATUS CHECK ===\n")

  // 1. Cron Runs (Last 24h)
  console.log("1. CRON RUNS (Last 24h):")
  try {
    const cronRuns = await sql`
      SELECT 
        job_name, 
        status, 
        COUNT(*) as run_count, 
        MAX(started_at) as last_run
      FROM admin_cron_runs
      WHERE started_at > NOW() - INTERVAL '24 hours'
      GROUP BY job_name, status
      ORDER BY job_name, status
    `
    if (cronRuns.length === 0) {
      console.log("  ⚠️  No cron runs found in last 24h")
    } else {
      console.log(JSON.stringify(cronRuns, null, 2))
    }
  } catch (error: any) {
    console.error("  ❌ Error:", error.message)
  }

  // 2. Email Sends (Last 24h)
  console.log("\n2. EMAIL SENDS (Last 24h):")
  try {
    const emailStats = await sql`
      SELECT 
        email_type, 
        status, 
        COUNT(*) as count, 
        MAX(sent_at) as last_sent
      FROM email_logs
      WHERE sent_at > NOW() - INTERVAL '24 hours'
      GROUP BY email_type, status
      ORDER BY email_type, status
    `
    if (emailStats.length === 0) {
      console.log("  ⚠️  No email sends found in last 24h")
    } else {
      console.log(JSON.stringify(emailStats, null, 2))
    }
  } catch (error: any) {
    console.error("  ❌ Error:", error.message)
  }

  // 3. Admin Errors (Last 24h)
  console.log("\n3. ADMIN ERRORS (Last 24h):")
  try {
    const errors = await sql`
      SELECT 
        tool_name, 
        COUNT(*) as error_count, 
        MAX(created_at) as last_seen
      FROM admin_email_errors
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY tool_name
      ORDER BY error_count DESC, last_seen DESC
      LIMIT 10
    `
    if (errors.length === 0) {
      console.log("  ✅ No errors found in last 24h")
    } else {
      console.log(JSON.stringify(errors, null, 2))
    }
  } catch (error: any) {
    console.error("  ❌ Error:", error.message)
  }

  // 4. Resend Message ID Verification (Last 7 days)
  console.log("\n4. RESEND MESSAGE ID VERIFICATION (Last 7 days):")
  try {
    const resendCheck = await sql`
      SELECT 
        email_type, 
        COUNT(*) as total, 
        COUNT(*) FILTER (WHERE resend_message_id IS NOT NULL) as with_resend_id,
        ROUND(100.0 * COUNT(*) FILTER (WHERE resend_message_id IS NOT NULL) / NULLIF(COUNT(*), 0), 1) as pct_with_id
      FROM email_logs
      WHERE sent_at > NOW() - INTERVAL '7 days'
        AND status = 'sent'
      GROUP BY email_type
      ORDER BY email_type
    `
    if (resendCheck.length === 0) {
      console.log("  ⚠️  No sent emails found in last 7 days")
    } else {
      console.log(JSON.stringify(resendCheck, null, 2))
    }
  } catch (error: any) {
    console.error("  ❌ Error:", error.message)
  }

  console.log("\n=== CHECK COMPLETE ===\n")
}

checkProductionStatus().catch(console.error)

