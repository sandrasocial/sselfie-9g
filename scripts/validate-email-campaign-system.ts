/**
 * Comprehensive Email Campaign System Validation
 * 
 * This script validates:
 * 1. Database tables and schemas
 * 2. Environment variables
 * 3. Email templates
 * 4. API endpoints
 * 5. Creates test campaign
 * 6. Sends test email
 * 
 * Run with: pnpm exec tsx scripts/validate-email-campaign-system.ts
 */

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { resolve } from "path"
import { readFileSync, existsSync } from "fs"

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ssa@ssasocial.com"

interface ValidationResult {
  part: string
  status: "pass" | "fail" | "warning"
  message: string
  details?: any
}

const results: ValidationResult[] = []

function logResult(part: string, status: "pass" | "fail" | "warning", message: string, details?: any) {
  results.push({ part, status, message, details })
  const icon = status === "pass" ? "✅" : status === "fail" ? "❌" : "⚠️"
  console.log(`${icon} ${part}: ${message}`)
  if (details) {
    console.log(`   Details:`, details)
  }
}

async function validateDatabaseTables() {
  console.log("\n📊 PART 1: DATABASE VALIDATION\n")

  // Check admin_email_campaigns table
  try {
    const campaigns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'admin_email_campaigns'
      ORDER BY ordinal_position
    `
    
    const requiredColumns = [
      "id", "campaign_name", "campaign_type", "subject_line",
      "body_html", "body_text", "status", "target_audience",
      "scheduled_for", "created_by", "created_at", "updated_at",
      "total_recipients", "total_sent", "total_failed", "sent_at"
    ]
    
    const existingColumns = campaigns.map((c: any) => c.column_name)
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col))
    
    if (missingColumns.length > 0) {
      logResult(
        "admin_email_campaigns",
        "warning",
        `Missing columns: ${missingColumns.join(", ")}`,
        { existing: existingColumns, missing: missingColumns }
      )
      
      // Add missing columns
      if (missingColumns.includes("resend_broadcast_id")) {
        await sql`ALTER TABLE admin_email_campaigns ADD COLUMN IF NOT EXISTS resend_broadcast_id TEXT`
        logResult("admin_email_campaigns", "pass", "Added resend_broadcast_id column")
      }
      if (missingColumns.includes("total_sent")) {
        await sql`ALTER TABLE admin_email_campaigns ADD COLUMN IF NOT EXISTS total_sent INTEGER DEFAULT 0`
        logResult("admin_email_campaigns", "pass", "Added total_sent column")
      }
      if (missingColumns.includes("total_failed")) {
        await sql`ALTER TABLE admin_email_campaigns ADD COLUMN IF NOT EXISTS total_failed INTEGER DEFAULT 0`
        logResult("admin_email_campaigns", "pass", "Added total_failed column")
      }
    } else {
      logResult("admin_email_campaigns", "pass", "All required columns exist")
    }
    
    // Test query
    await sql`SELECT * FROM admin_email_campaigns LIMIT 1`
    logResult("admin_email_campaigns", "pass", "Table is accessible")
  } catch (error: any) {
    logResult("admin_email_campaigns", "fail", `Table check failed: ${error.message}`)
  }

  // Check email_logs table
  try {
    const logs = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'email_logs'
      ORDER BY ordinal_position
    `
    
    const requiredColumns = [
      "id", "user_email", "email_type", "resend_message_id",
      "status", "error_message", "sent_at", "campaign_id"
    ]
    
    const existingColumns = logs.map((l: any) => l.column_name)
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col))
    
    if (missingColumns.includes("campaign_id")) {
      await sql`ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS campaign_id INTEGER`
      logResult("email_logs", "pass", "Added campaign_id column")
    }
    
    await sql`SELECT * FROM email_logs LIMIT 1`
    logResult("email_logs", "pass", "Table is accessible")
  } catch (error: any) {
    logResult("email_logs", "fail", `Table check failed: ${error.message}`)
  }

  // Check blueprint_subscribers table
  try {
    const subscribers = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'blueprint_subscribers'
    `
    
    const existingColumns = subscribers.map((s: any) => s.column_name)
    const requiredColumns = [
      "day_3_email_sent", "day_3_email_sent_at",
      "day_7_email_sent", "day_7_email_sent_at",
      "day_10_email_sent", "day_10_email_sent_at",
      "day_14_email_sent", "day_14_email_sent_at"
    ]
    
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col))
    
    if (missingColumns.length > 0) {
      logResult(
        "blueprint_subscribers",
        "warning",
        `Missing columns: ${missingColumns.join(", ")}`,
        { missing: missingColumns }
      )
      
      // Add missing columns
      if (missingColumns.includes("day_10_email_sent")) {
        await sql`
          ALTER TABLE blueprint_subscribers
          ADD COLUMN IF NOT EXISTS day_10_email_sent BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS day_10_email_sent_at TIMESTAMP WITH TIME ZONE
        `
        logResult("blueprint_subscribers", "pass", "Added day_10_email columns")
      }
    } else {
      logResult("blueprint_subscribers", "pass", "All required columns exist")
    }
    
    await sql`SELECT * FROM blueprint_subscribers LIMIT 1`
    logResult("blueprint_subscribers", "pass", "Table is accessible")
  } catch (error: any) {
    logResult("blueprint_subscribers", "fail", `Table check failed: ${error.message}`)
  }
}

function validateEnvironmentVariables() {
  console.log("\n🔐 PART 2: ENVIRONMENT VALIDATION\n")

  const required = {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || "ssa@ssasocial.com",
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  }

  const optional = {
    RESEND_AUDIENCE_ID: process.env.RESEND_AUDIENCE_ID,
    RESEND_BETA_SEGMENT_ID: process.env.RESEND_BETA_SEGMENT_ID,
  }

  // Check required
  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      logResult(key, "fail", "Missing required environment variable")
    } else {
      if (key === "RESEND_API_KEY" && !value.startsWith("re_")) {
        logResult(key, "warning", "RESEND_API_KEY format may be incorrect (should start with 're_')")
      } else {
        logResult(key, "pass", `Set (${value.substring(0, 10)}...)`)
      }
    }
  }

  // Check optional
  for (const [key, value] of Object.entries(optional)) {
    if (value) {
      logResult(key, "pass", "Set")
    } else {
      logResult(key, "warning", "Not set (optional)")
    }
  }
}

function validateEmailTemplates() {
  console.log("\n📧 PART 3: EMAIL TEMPLATE VALIDATION\n")

  const requiredTemplates = [
    "lib/email/templates/upsell-freebie-membership.tsx",
    "lib/email/templates/nurture-day-7.tsx",
    "lib/email/templates/upsell-day-10.tsx",
    "lib/email/templates/win-back-offer.tsx",
    "lib/email/templates/nurture-day-1.tsx",
    "lib/email/templates/nurture-day-3.tsx",
    "lib/email/templates/welcome-back-reengagement.tsx",
  ]

  for (const templatePath of requiredTemplates) {
    const fullPath = resolve(process.cwd(), templatePath)
    if (existsSync(fullPath)) {
      try {
        // Try to read and parse the file
        const content = readFileSync(fullPath, "utf-8")
        // Check if it exports a function
        if (content.includes("export function") || content.includes("export const")) {
          logResult(templatePath, "pass", "Template exists and is valid")
        } else {
          logResult(templatePath, "warning", "Template exists but may not export function")
        }
      } catch (error: any) {
        logResult(templatePath, "fail", `Error reading template: ${error.message}`)
      }
    } else {
      logResult(templatePath, "fail", "Template file not found")
    }
  }
}

function validateAPIEndpoints() {
  console.log("\n🔌 PART 4: API ENDPOINT VALIDATION\n")

  const requiredEndpoints = [
    "app/api/admin/email/run-scheduled-campaigns/route.ts",
    "app/api/admin/agent/email-campaigns/route.ts",
    "app/api/cron/send-blueprint-followups/route.ts", // Day 2 automation endpoint
  ]

  for (const endpointPath of requiredEndpoints) {
    const fullPath = resolve(process.cwd(), endpointPath)
    if (existsSync(fullPath)) {
      logResult(endpointPath, "pass", "Endpoint file exists")
    } else {
      logResult(endpointPath, "fail", "Endpoint file not found")
    }
  }
}

async function createTestCampaign() {
  console.log("\n📝 PART 5: CREATE TEST CAMPAIGN\n")

  try {
    const result = await sql`
      INSERT INTO admin_email_campaigns (
        campaign_name, 
        campaign_type, 
        subject_line, 
        body_html,
        body_text,
        status,
        target_audience,
        created_by,
        created_at,
        updated_at
      ) VALUES (
        'VALIDATION TEST - December 2024',
        'welcome_back_reengagement',
        'I''ve been thinking about you...',
        '<p>Test email body HTML</p>',
        'Test email body text',
        'draft',
        '{"resend_segment_id": "3cd6c5e3-fdf9-4744-b7f3-fda7c8cdf6cd"}'::jsonb,
        ${ADMIN_EMAIL},
        NOW(),
        NOW()
      )
      RETURNING id, campaign_name, status
    `

    if (result && result.length > 0) {
      const campaign = result[0]
      logResult("test_campaign", "pass", `Created with ID: ${campaign.id}`, campaign)
      return campaign.id
    } else {
      logResult("test_campaign", "fail", "Failed to create test campaign")
      return null
    }
  } catch (error: any) {
    logResult("test_campaign", "fail", `Error creating test campaign: ${error.message}`)
    return null
  }
}

async function sendTestEmail(campaignId: number) {
  console.log("\n📬 PART 6: SEND TEST EMAIL\n")

  try {
    // Import email template
    const { generateWelcomeBackReengagementEmail } = await import("@/lib/email/templates/welcome-back-reengagement")
    const { sendEmail } = await import("@/lib/email/send-email")

    // Get campaign
    const campaign = await sql`
      SELECT id, campaign_name, campaign_type, subject_line
      FROM admin_email_campaigns
      WHERE id = ${campaignId}
    `

    if (!campaign || campaign.length === 0) {
      logResult("test_email", "fail", "Test campaign not found")
      return false
    }

    const testCampaign = campaign[0]
    logResult("test_email", "pass", `Found test campaign: ${testCampaign.campaign_name}`)

    // Generate email content
    const emailContent = generateWelcomeBackReengagementEmail({
      firstName: "Sandra",
      recipientEmail: ADMIN_EMAIL,
      campaignId: testCampaign.id,
      campaignName: testCampaign.campaign_name,
    })

    logResult("test_email", "pass", `Email content generated (${emailContent.html.length} chars)`)

    // Send test email
    console.log(`\n📧 Sending test email to ${ADMIN_EMAIL}...`)

    const result = await sendEmail({
      to: ADMIN_EMAIL,
      subject: `[TEST] ${testCampaign.subject_line}`,
      html: emailContent.html,
      text: emailContent.text,
      emailType: `campaign-test-${testCampaign.id}`,
    })

    if (result.success) {
      logResult("test_email", "pass", `Email sent successfully!`, {
        messageId: result.messageId,
        recipient: ADMIN_EMAIL,
      })

      // Log to email_logs
      await sql`
        INSERT INTO email_logs (
          user_email, email_type, resend_message_id, 
          status, campaign_id, sent_at
        ) VALUES (
          ${ADMIN_EMAIL}, 
          ${"campaign-test-" + testCampaign.id}, 
          ${result.messageId || null},
          'sent',
          ${testCampaign.id},
          NOW()
        )
      `

      logResult("test_email", "pass", "Logged to email_logs table")
      return true
    } else {
      logResult("test_email", "fail", `Failed to send: ${result.error}`)
      return false
    }
  } catch (error: any) {
    logResult("test_email", "fail", `Error: ${error.message}`)
    return false
  }
}

function printSummary() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("📋 VALIDATION SUMMARY")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

  const passed = results.filter((r) => r.status === "pass").length
  const failed = results.filter((r) => r.status === "fail").length
  const warnings = results.filter((r) => r.status === "warning").length

  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`⚠️  Warnings: ${warnings}`)
  console.log(`📊 Total: ${results.length}\n`)

  if (failed > 0) {
    console.log("❌ FAILED CHECKS:")
    results
      .filter((r) => r.status === "fail")
      .forEach((r) => {
        console.log(`   - ${r.part}: ${r.message}`)
      })
    console.log()
  }

  if (warnings > 0) {
    console.log("⚠️  WARNINGS:")
    results
      .filter((r) => r.status === "warning")
      .forEach((r) => {
        console.log(`   - ${r.part}: ${r.message}`)
      })
    console.log()
  }

  if (failed === 0) {
    console.log("✅ VALIDATION COMPLETE - SYSTEM READY\n")
    console.log("⏳ NEXT STEPS:")
    console.log(`   1. Check your email: ${ADMIN_EMAIL}`)
    console.log(`   2. Review the email formatting and content`)
    console.log(`   3. If it looks good, approve to go LIVE\n`)
    console.log("🚀 TO GO LIVE (after approval):")
    console.log(`   Run this command to send to ALL subscribers:\n`)
    console.log(`   curl -X POST https://sselfie.ai/api/admin/email/run-scheduled-campaigns \\`)
    console.log(`     -H "Content-Type: application/json" \\`)
    console.log(`     -d '{"mode": "live", "campaignId": [CAMPAIGN_ID]}'\n`)
    console.log(`   WARNING: This will send to ~2,700 subscribers!`)
    console.log(`   Make sure test email looks good first.\n`)
  } else {
    console.log("❌ VALIDATION FAILED - Please fix errors before proceeding\n")
  }
}

async function main() {
  console.log("\n🧪 EMAIL CAMPAIGN SYSTEM VALIDATION\n")
  console.log("=" .repeat(50))

  // Part 1: Database
  await validateDatabaseTables()

  // Part 2: Environment
  validateEnvironmentVariables()

  // Part 3: Templates
  validateEmailTemplates()

  // Part 4: API Endpoints
  validateAPIEndpoints()

  // Part 5: Create Test Campaign
  const campaignId = await createTestCampaign()

  // Part 6: Send Test Email
  if (campaignId) {
    await sendTestEmail(campaignId)
  }

  // Part 7: Summary
  printSummary()

  // Exit with appropriate code
  const hasFailures = results.some((r) => r.status === "fail")
  process.exit(hasFailures ? 1 : 0)
}

main().catch((error) => {
  console.error("❌ Validation script failed:", error)
  process.exit(1)
})
