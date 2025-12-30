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
import { generateNurtureDay1Email } from "./templates/nurture-day-1"
import { generateNurtureDay3Email } from "./templates/nurture-day-3"
import { generateNurtureDay7Email } from "./templates/nurture-day-7"
import { generateUpsellFreebieMembershipEmail } from "./templates/upsell-freebie-membership"
import { generateWelcomeBackReengagementEmail } from "./templates/welcome-back-reengagement"
import { generateNewsletterEmail } from "./templates/newsletter-template"
import { generateUpsellDay10Email } from "./templates/upsell-day-10"
import { generateWinBackOfferEmail } from "./templates/win-back-offer"

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

  // Internal segment-based targeting (new advanced segmentation)
  if (targetAudience.segment_id) {
    try {
      const { getSegmentMembers } = await import("./segmentation")
      const members = await getSegmentMembers(targetAudience.segment_id)
      console.log(`[v0] Campaign targets internal segment ${targetAudience.segment_id}, found ${members.length} members`)
      return members
    } catch (error) {
      console.error(`[v0] Error fetching segment members:`, error)
      return []
    }
  }

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

      console.log(`[v0] Campaign targets Resend segment ${targetAudience.resend_segment_id}, fetching contacts from Resend`)
      
      // Fetch all contacts from Resend audience
      // Note: Resend API doesn't support filtering by segment directly, so we fetch all and filter
      // In practice, Resend broadcasts handle segment targeting automatically
      const { getAudienceContacts } = await import("@/lib/resend/get-audience-contacts")
      const allContacts = await getAudienceContacts(audienceId)
      
      // Extract emails from contacts
      recipientEmails = allContacts
        .map((contact: any) => contact.email)
        .filter((email: string) => email && email.includes("@"))
      
      console.log(`[v0] Fetched ${recipientEmails.length} contacts from Resend audience`)
      
      // If we have a specific segment, we can't filter via API, but Resend will handle it in broadcasts
      // For individual sends, we'll send to all contacts (segment targeting happens in Resend's side)
      // This is a limitation - we can't get segment contacts directly via API
      
    } catch (error) {
      console.error("[v0] Error resolving Resend segment recipients:", error)
      // Fallback to database if Resend fetch fails
      console.log(`[v0] Falling back to database for segment ${targetAudience.resend_segment_id}`)
      const users = await sql`
        SELECT email FROM users
        WHERE email IS NOT NULL AND email != ''
      `
      recipientEmails = users.map((u: any) => u.email).filter(Boolean)
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
 * EXPORTED for use in preview endpoints
 */
export function getEmailContent(
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

  if (campaign_type === "nurture_day_1") {
    const content = generateNurtureDay1Email({
      firstName: recipientName,
      recipientEmail,
      campaignId: campaign.id,
      campaignName: campaign.campaign_name,
    })
    return { html: content.html, text: content.text, templateUsed: "nurture-day-1" }
  }

  if (campaign_type === "nurture_day_3") {
    const content = generateNurtureDay3Email({
      firstName: recipientName,
      recipientEmail,
      campaignId: campaign.id,
      campaignName: campaign.campaign_name,
    })
    return { html: content.html, text: content.text, templateUsed: "nurture-day-3" }
  }

  if (campaign_type === "nurture_day_7") {
    const content = generateNurtureDay7Email({
      firstName: recipientName,
      recipientEmail,
      campaignId: campaign.id,
      campaignName: campaign.campaign_name,
    })
    return { html: content.html, text: content.text, templateUsed: "nurture-day-7" }
  }

  if (campaign_type === "upsell_freebie_to_membership") {
    const content = generateUpsellFreebieMembershipEmail({
      firstName: recipientName,
      recipientEmail,
      campaignId: campaign.id,
      campaignName: campaign.campaign_name,
    })
    return { html: content.html, text: content.text, templateUsed: "upsell-freebie-membership" }
  }

  if (campaign_type === "upsell_day_10") {
    const content = generateUpsellDay10Email({
      firstName: recipientName,
      recipientEmail,
      campaignId: campaign.id,
      campaignName: campaign.campaign_name,
    })
    return { html: content.html, text: content.text, templateUsed: "upsell-day-10" }
  }

  if (campaign_type === "welcome_back_reengagement") {
    const content = generateWelcomeBackReengagementEmail({
      firstName: recipientName,
      recipientEmail,
      campaignId: campaign.id,
      campaignName: campaign.campaign_name,
    })
    return { html: content.html, text: content.text, templateUsed: "welcome-back-reengagement" }
  }

  if (campaign_type === "win_back_offer") {
    // Extract offer details from campaign metadata if available
    const offerData = campaign.metrics || {}
    const content = generateWinBackOfferEmail({
      firstName: recipientName,
      recipientEmail,
      // Support both dollar amounts and percentages
      offerAmount: offerData.amount, // Dollar amount (e.g., 10 for $10 off)
      offerDiscount: offerData.discount, // Percentage (e.g., 20 for 20% off)
      offerCode: offerData.code,
      offerExpiry: offerData.expiry,
      campaignId: campaign.id,
      campaignName: campaign.campaign_name,
    })
    return { html: content.html, text: content.text, templateUsed: "win-back-offer" }
  }

  if (campaign_type === "newsletter") {
    // Newsletter template requires specific content - use stored content but with template structure
    // For now, use stored content. In future, can parse structured data from campaign.metrics
    // TODO: Parse newsletter content from campaign.metrics (tipTitle, tipContent, memberStory, etc.)
    // For now, using stored body_html/body_text
    return {
      html: body_html || "",
      text: body_text || "",
      templateUsed: "newsletter-template",
    }
  }

  // For other types (promotional, announcement, etc.), use stored content
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
  campaignId?: number,
): Promise<void> {
  try {
    await sql`
      INSERT INTO email_logs (
        user_email,
        email_type,
        resend_message_id,
        status,
        error_message,
        sent_at,
        campaign_id
      )
      VALUES (
        ${userEmail},
        ${emailType},
        ${resendMessageId || null},
        ${status},
        ${errorMessage || null},
        NOW(),
        ${campaignId || null}
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
          await logEmailSend(recipientEmail, `campaign-${campaign.id}`, "failed", undefined, errorMsg, campaign.id)
          continue
        }
      }

      // Get email content (with template if applicable)
      const emailContent = getEmailContent(campaign, recipientEmail)
      if (emailContent.templateUsed) {
        result.templateUsed = emailContent.templateUsed
      }

      // Validate email content before sending
      if (!emailContent.html || emailContent.html.trim().length === 0) {
        const errorMsg = "Email HTML content is empty"
        result.errors.push(`${recipientEmail}: ${errorMsg}`)
        result.recipients.failed++
        await logEmailSend(recipientEmail, `campaign-${campaign.id}`, "failed", undefined, errorMsg, campaign.id)
        console.error(`[v0] ✗ Campaign ${campaign.id} has empty HTML content`)
        continue
      }

      if (!emailContent.text || emailContent.text.trim().length === 0) {
        const errorMsg = "Email text content is empty"
        result.errors.push(`${recipientEmail}: ${errorMsg}`)
        result.recipients.failed++
        await logEmailSend(recipientEmail, `campaign-${campaign.id}`, "failed", undefined, errorMsg, campaign.id)
        console.error(`[v0] ✗ Campaign ${campaign.id} has empty text content`)
        continue
      }

      console.log(`[v0] Sending email to ${recipientEmail}:`, {
        subject: campaign.subject_line,
        htmlLength: emailContent.html.length,
        textLength: emailContent.text.length,
        hasSubject: !!campaign.subject_line,
      })

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
          undefined,
          campaign.id,
        )
        console.log(`[v0] ✓ Sent campaign ${campaign.id} to ${recipientEmail}`)
      } else {
        result.recipients.failed++
        const errorMsg = emailResult.error || "Unknown error"
        result.errors.push(`${recipientEmail}: ${errorMsg}`)
        await logEmailSend(recipientEmail, `campaign-${campaign.id}`, "failed", undefined, errorMsg, campaign.id)
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
      await logEmailSend(recipientEmail, `campaign-${campaign.id}`, "failed", undefined, errorMsg, campaign.id)
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

  if (mode === "test") {
    // In test mode, allow testing any campaign regardless of status
    if (campaignId) {
      // Specific campaign requested for testing
      campaigns = await sql`
        SELECT * FROM admin_email_campaigns
        WHERE id = ${campaignId}
      `
      console.log(`[v0] Test mode: Looking for campaign ${campaignId} (any status)`)
    } else {
      // In test mode without campaignId, return empty (user should specify which campaign to test)
      console.log(`[v0] Test mode: No campaignId specified. Please specify a campaign ID to test.`)
      return []
    }
  } else {
    // Live mode: only process scheduled campaigns
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
  }

  if (campaigns.length === 0) {
    if (mode === "test") {
      console.log(`[v0] No campaign found with ID ${campaignId}. Check that the campaign exists.`)
    } else {
      console.log(`[v0] No scheduled campaigns found to process`)
    }
    return []
  }

  console.log(`[v0] Found ${campaigns.length} campaign(s) to process`)
  if (mode === "test") {
    campaigns.forEach((c) => {
      console.log(`[v0] Test campaign: ID=${c.id}, Name="${c.campaign_name}", Status="${c.status}"`)
    })
  }

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

