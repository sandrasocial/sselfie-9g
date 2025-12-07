/**
 * Scheduled Campaign Executor
 * 
 * This module processes scheduled email campaigns from admin_email_campaigns table.
 * 
 * Schema Reference (admin_email_campaigns):
 * - id: Campaign ID
 * - campaign_name: Human-readable name
 * - campaign_type: 'newsletter', 'promotional', 'welcome', 'announcement', etc.
 * - subject_line: Email subject
 * - body_html: HTML email content
 * - body_text: Plain text email content
 * - target_audience: JSONB with recipient criteria:
 *   - { all_users: true } - send to all users
 *   - { plan: 'sselfie_studio_membership' } - send to users with specific plan
 *   - { recipients: ['email1@example.com', ...] } - explicit email list
 * - scheduled_for: TIMESTAMPTZ when campaign should run
 * - status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
 * 
 * Current campaign_type values in use:
 * - 'newsletter' - Weekly/monthly newsletters
 * - 'promotional' - Promotional campaigns
 * - 'welcome' - Welcome sequences
 * - 'announcement' - Product announcements
 * 
 * Status flow:
 * - 'scheduled' + scheduled_for <= NOW() → processed by this executor
 * - After processing → 'sent' (success) or 'failed' (all failed) or 'sending' (partial)
 */

import { neon } from "@neondatabase/serverless"
import { sendEmail } from "./send-email"
import { checkEmailRateLimit } from "@/lib/rate-limit"
import { generateLaunchFollowupEmail } from "./templates/launch-followup-email"
import { generateBetaTestimonialEmail } from "./templates/beta-testimonial-request"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ssa@ssasocial.com"

export interface RunScheduledCampaignsConfig {
  mode: "live" | "test"
  campaignId?: number // If provided, only run this specific campaign
}

export interface CampaignExecutionResult {
  campaignId: number
  campaignName: string
  campaignType: string
  templateUsed?: string
  recipients: {
    total: number
    sent: number
    failed: number
    testEmail?: string // Only in test mode
  }
  errors: string[]
}

/**
 * Resolve recipient emails from target_audience JSONB
 * Reuses the same pattern as app/api/admin/agent/send-email/route.ts
 * Extended to support:
 * - all_users: All users in database
 * - plan: Users with specific plan
 * - recipients: Explicit email list
 * - resend_segment_id: Resend segment ID (for newsletters and beta testimonials)
 * - resend_audience_id: Full Resend audience (for newsletters)
 */
async function resolveRecipients(targetAudience: any): Promise<string[]> {
  if (!targetAudience || typeof targetAudience !== "object") {
    return []
  }

  let recipientEmails: string[] = []

  // Resend segment-based targeting (for newsletters and beta testimonials)
  if (targetAudience.resend_segment_id) {
    try {
      const { Resend } = await import("resend")
      const resend = new Resend(process.env.RESEND_API_KEY)
      const audienceId = process.env.RESEND_AUDIENCE_ID

      if (!audienceId) {
        console.warn("[v0] RESEND_AUDIENCE_ID not configured, cannot resolve segment recipients")
        return []
      }

      // Note: Resend API doesn't directly expose segment contacts, so we fall back to
      // fetching all contacts and filtering by tags, or use the segment in the broadcast
      // For now, we'll use the database users as a fallback
      console.log(`[v0] Campaign targets Resend segment ${targetAudience.resend_segment_id}, using database fallback`)
      
      // For beta testimonials, get paying customers
      if (targetAudience.segment_type === "beta_customers") {
        const users = await sql`
          SELECT DISTINCT u.email
          FROM users u
          INNER JOIN subscriptions s ON u.id = s.user_id::varchar
          WHERE u.email IS NOT NULL AND u.email != '' AND s.is_test_mode = FALSE
          UNION
          SELECT DISTINCT u.email
          FROM users u
          INNER JOIN credit_transactions ct ON u.id = ct.user_id::varchar
          WHERE u.email IS NOT NULL AND u.email != ''
            AND ct.is_test_mode = FALSE
            AND ct.transaction_type = 'purchase'
            AND ct.amount > 0
        `
        recipientEmails = users.map((u: any) => u.email).filter(Boolean)
      } else {
        // For newsletters, get all users (or use all_users flag)
        const users = await sql`
          SELECT email FROM users
          WHERE email IS NOT NULL AND email != ''
        `
        recipientEmails = users.map((u: any) => u.email).filter(Boolean)
      }
    } catch (error) {
      console.error("[v0] Error resolving Resend segment recipients:", error)
      return []
    }
  } else if (targetAudience.all_users) {
    const users = await sql`
      SELECT email FROM users
      WHERE email IS NOT NULL AND email != ''
    `
    recipientEmails = users.map((u: any) => u.email).filter(Boolean)
  } else if (targetAudience.plan) {
    const users = await sql`
      SELECT email FROM users
      WHERE email IS NOT NULL AND email != '' AND plan = ${targetAudience.plan}
    `
    recipientEmails = users.map((u: any) => u.email).filter(Boolean)
  } else if (targetAudience.recipients && Array.isArray(targetAudience.recipients)) {
    recipientEmails = targetAudience.recipients.filter((email: any) => typeof email === "string" && email.includes("@"))
  }

  return recipientEmails
}

/**
 * Get email content for a campaign
 * Maps campaign_type to appropriate templates or uses stored body_html/body_text
 */
function getEmailContent(
  campaign: any,
  recipientEmail: string,
  recipientName?: string,
): { html: string; text: string; templateUsed?: string } {
  const { campaign_type, body_html, body_text, subject_line } = campaign

  // For specific campaign types, use dedicated templates
  if (campaign_type === "launch_followup") {
    const content = generateLaunchFollowupEmail({
      recipientEmail,
      recipientName,
      trackingId: `campaign-${campaign.id}`,
    })
    return { html: content.html, text: content.text, templateUsed: "launch-followup-email" }
  }

  if (campaign_type === "beta_testimonial") {
    const content = generateBetaTestimonialEmail({
      customerName: recipientName || recipientEmail.split("@")[0],
    })
    return { html: content.html, text: content.text, templateUsed: "beta-testimonial-request" }
  }

  // For other types (newsletter, promotional, announcement, etc.), use stored content
  // TODO: Add dedicated templates for:
  // - newsletter campaigns
  // - promotional campaigns
  // - announcement campaigns
  // For now, using stored body_html/body_text from the campaign record
  return {
    html: body_html || "",
    text: body_text || "",
    templateUsed: "stored_content",
  }
}

/**
 * Log email send attempt to email_logs table
 */
async function logEmailSend(
  userEmail: string,
  emailType: string,
  status: "sent" | "failed",
  resendMessageId?: string,
  errorMessage?: string,
): Promise<void> {
  try {
    await sql`
      INSERT INTO email_logs (
        user_email,
        email_type,
        resend_message_id,
        status,
        error_message,
        sent_at
      )
      VALUES (
        ${userEmail},
        ${emailType},
        ${resendMessageId || null},
        ${status},
        ${errorMessage || null},
        NOW()
      )
    `
  } catch (error) {
    console.error(`[v0] Failed to log email send for ${userEmail}:`, error)
    // Don't throw - logging failure shouldn't break the campaign
  }
}

/**
 * Execute a single scheduled campaign
 */
async function executeCampaign(
  campaign: any,
  config: RunScheduledCampaignsConfig,
): Promise<CampaignExecutionResult> {
  const { mode, campaignId } = config
  const result: CampaignExecutionResult = {
    campaignId: campaign.id,
    campaignName: campaign.campaign_name,
    campaignType: campaign.campaign_type,
    recipients: {
      total: 0,
      sent: 0,
      failed: 0,
    },
    errors: [],
  }

  console.log(`[v0] Executing campaign ${campaign.id} (${campaign.campaign_name}) in ${mode} mode`)

  // Resolve recipients
  let recipientEmails: string[] = []

  if (mode === "test") {
    // In test mode, send only to admin email
    recipientEmails = [ADMIN_EMAIL]
    result.recipients.testEmail = ADMIN_EMAIL
    console.log(`[v0] TEST MODE: Sending to admin email only: ${ADMIN_EMAIL}`)
  } else {
    // In live mode, resolve from target_audience
    recipientEmails = await resolveRecipients(campaign.target_audience)
    if (recipientEmails.length === 0) {
      result.errors.push("No recipients found for campaign")
      console.error(`[v0] No recipients found for campaign ${campaign.id}`)
      return result
    }
  }

  result.recipients.total = recipientEmails.length
  console.log(`[v0] Campaign ${campaign.id} has ${recipientEmails.length} recipients`)

  // Update campaign status to 'sending' (only in live mode)
  if (mode === "live") {
    await sql`
      UPDATE admin_email_campaigns
      SET status = 'sending', total_recipients = ${recipientEmails.length}, updated_at = NOW()
      WHERE id = ${campaign.id}
    `
  }

  // Send emails to each recipient
  for (const recipientEmail of recipientEmails) {
    try {
      // Check rate limit (only in live mode, test mode bypasses)
      if (mode === "live") {
        const rateLimit = await checkEmailRateLimit(recipientEmail)
        if (!rateLimit.success) {
          const errorMsg = `Rate limit exceeded for ${recipientEmail}`
          result.errors.push(errorMsg)
          result.recipients.failed++
          await logEmailSend(recipientEmail, `campaign-${campaign.id}`, "failed", undefined, errorMsg)
          continue
        }
      }

      // Get email content (with template if applicable)
      const emailContent = getEmailContent(campaign, recipientEmail)
      if (emailContent.templateUsed) {
        result.templateUsed = emailContent.templateUsed
      }

      // Send email
      const emailResult = await sendEmail({
        to: recipientEmail,
        subject: campaign.subject_line,
        html: emailContent.html,
        text: emailContent.text,
        tags: ["campaign", campaign.campaign_type, `campaign-${campaign.id}`],
      })

      if (emailResult.success) {
        result.recipients.sent++
        await logEmailSend(
          recipientEmail,
          `campaign-${campaign.id}`,
          "sent",
          emailResult.messageId,
        )
        console.log(`[v0] ✓ Sent campaign ${campaign.id} to ${recipientEmail}`)
      } else {
        result.recipients.failed++
        const errorMsg = emailResult.error || "Unknown error"
        result.errors.push(`${recipientEmail}: ${errorMsg}`)
        await logEmailSend(recipientEmail, `campaign-${campaign.id}`, "failed", undefined, errorMsg)
        console.error(`[v0] ✗ Failed to send campaign ${campaign.id} to ${recipientEmail}: ${errorMsg}`)
      }

      // Small delay between sends to avoid overwhelming the email service
      if (mode === "live" && recipientEmails.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    } catch (error: any) {
      result.recipients.failed++
      const errorMsg = error?.message || "Unexpected error"
      result.errors.push(`${recipientEmail}: ${errorMsg}`)
      await logEmailSend(recipientEmail, `campaign-${campaign.id}`, "failed", undefined, errorMsg)
      console.error(`[v0] Exception sending to ${recipientEmail}:`, error)
    }
  }

  // Update campaign status based on results (only in live mode)
  if (mode === "live") {
    const finalStatus = result.recipients.failed === 0 ? "sent" : result.recipients.sent > 0 ? "sent" : "failed"
    await sql`
      UPDATE admin_email_campaigns
      SET 
        status = ${finalStatus},
        sent_at = NOW(),
        total_recipients = ${result.recipients.total},
        metrics = ${JSON.stringify({
          sent: result.recipients.sent,
          failed: result.recipients.failed,
          errors: result.errors.slice(0, 10), // Store first 10 errors
        })},
        updated_at = NOW()
      WHERE id = ${campaign.id}
    `
    console.log(`[v0] Campaign ${campaign.id} completed: ${result.recipients.sent} sent, ${result.recipients.failed} failed`)
  } else {
    console.log(`[v0] TEST MODE: Campaign ${campaign.id} test completed (status not updated)`)
  }

  return result
}

/**
 * Main function to run scheduled campaigns
 */
export async function runScheduledCampaigns(
  config: RunScheduledCampaignsConfig,
): Promise<CampaignExecutionResult[]> {
  const { mode, campaignId } = config

  console.log(`[v0] Running scheduled campaigns in ${mode} mode${campaignId ? ` (campaign ${campaignId})` : ""}`)

  // Find campaigns to process
  let campaigns: any[] = []

  if (campaignId) {
    // Specific campaign requested
    campaigns = await sql`
      SELECT * FROM admin_email_campaigns
      WHERE id = ${campaignId}
      AND status = 'scheduled'
    `
  } else {
    // All due campaigns
    campaigns = await sql`
      SELECT * FROM admin_email_campaigns
      WHERE status = 'scheduled'
      AND scheduled_for IS NOT NULL
      AND scheduled_for <= NOW()
      ORDER BY scheduled_for ASC
    `
  }

  if (campaigns.length === 0) {
    console.log(`[v0] No scheduled campaigns found to process`)
    return []
  }

  console.log(`[v0] Found ${campaigns.length} campaign(s) to process`)

  // Execute each campaign
  const results: CampaignExecutionResult[] = []
  for (const campaign of campaigns) {
    try {
      const result = await executeCampaign(campaign, config)
      results.push(result)
    } catch (error: any) {
      console.error(`[v0] Error executing campaign ${campaign.id}:`, error)
      results.push({
        campaignId: campaign.id,
        campaignName: campaign.campaign_name || "Unknown",
        campaignType: campaign.campaign_type || "unknown",
        recipients: { total: 0, sent: 0, failed: 0 },
        errors: [error?.message || "Unexpected error executing campaign"],
      })
    }
  }

  return results
}

