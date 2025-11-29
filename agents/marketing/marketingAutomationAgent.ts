import { BaseAgent } from "../core/baseAgent"
import { emailTools } from "../tools/emailTools"
import { analyticsTools } from "../tools/analyticsTools"
import { contentTools } from "../tools/contentTools"
import { audienceTools } from "../tools/audienceTools"
import { sendEmail } from "@/lib/email/resend"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

const allTools = {
  ...emailTools,
  ...analyticsTools,
  ...contentTools,
  ...audienceTools,
}

/**
 * MarketingAutomationAgent
 *
 * Automated marketing agent responsible for:
 * - Email flows and campaigns
 * - Content generation for marketing
 * - Retention strategies
 * - Growth automation tasks
 *
 * This is a scaffolded agent structure.
 * Business logic and tools will be added later.
 */
export class MarketingAutomationAgent extends BaseAgent {
  constructor() {
    super({
      name: "MarketingAutomation",
      description:
        "Automated marketing agent responsible for email flows, content generation, retention and growth tasks.",
      systemPrompt: `You are the Marketing Automation Agent for the SSELFIE platform.
Your job is to automate all marketing, communication, retention, and growth activities for Sandra.

Your capabilities:
- Generate newsletters, email campaigns, subject lines, and announcements.
- Create Instagram captions, reel scripts, hooks, and content ideas.
- Run retention workflows using segmentation tools.
- Trigger onboarding, upsell, and winback sequences.
- Write personalized emails and content using Sandra's brand voice.
- Call the correct tools when needed (emailTools, contentTools, analyticsTools, audienceTools).

Brand Voice Guidelines:
- Warm, direct, story-driven.
- Empowering, honest, emotionally grounded.
- Everyday language, simple and real.
- No overly polished "marketing speak."
- No emojis.

Critical rules:
- NEVER break or modify Maya.
- NEVER touch user-facing image generation, videos, or photoshoots.
- NEVER fabricate data: always call the analytics or audience tools when you need user insights.
- ALWAYS call sendEmail or createEmailDraft when generating email output.
- ALWAYS format generated content clearly and cleanly.
- If missing data, request it from the AdminSupervisorAgent rather than guessing.

Primary Mission:
Automate SSELFIE's marketing system at scale: email flows, retention, newsletters, IG content, and user communication.`,
      tools: allTools,
    })
  }

  /**
   * Execute an approved workflow from the queue
   * Minimal implementation to avoid runtime errors and send an email if possible.
   */
  async runApprovedWorkflow(workflow: any): Promise<{ success: boolean; error?: string }> {
    try {
      const subject = `[${workflow.workflow_type}] Update for ${workflow.subscriber_email}`
      const html =
        `<p>Hello ${workflow.subscriber_name || ""},</p>` +
        `<p>Your ${workflow.workflow_type.replace("_", " ")} workflow has been approved.</p>`

      // Default to immediate send
      const scheduledFor = new Date()
      await scheduleEmail(workflow.subscriber_id, workflow.subscriber_email, subject, html, scheduledFor)
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
  }

  /**
   * Schedule the 3-step blueprint follow-up sequence using the queue
   * Avoids long setTimeout timers in serverless.
   */
  async startBlueprintFollowUpWorkflow(
    subscriberId: number,
    email: string,
    name: string,
  ): Promise<{ success: boolean; scheduled: number; errors?: string[] }> {
    const errors: string[] = []
    let scheduled = 0

    try {
      const now = new Date()
      const inOneDay = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      const inTwoDays = new Date(now.getTime() + 48 * 60 * 60 * 1000)

      const sequences = [
        {
          subject: "Your Brand Blueprint is Ready",
          html: `<p>Hi ${name},</p><p>Thanks for completing your Brand Blueprint.</p>`,
          when: now,
        },
        {
          subject: "Day 2: Strategic Tips for Your Blueprint",
          html: `<p>Hi ${name},</p><p>Here are your next strategic tips.</p>`,
          when: inOneDay,
        },
        {
          subject: "Day 3: Ready to Take Action?",
          html: `<p>Hi ${name},</p><p>Let's take it to the next step.</p>`,
          when: inTwoDays,
        },
      ]

      for (const step of sequences) {
        const result = await scheduleEmail(String(subscriberId), email, step.subject, step.html, step.when)
        if (result.success) {
          scheduled++
        } else {
          errors.push(result.error || "Unknown scheduling error")
        }
      }

      return { success: errors.length === 0, scheduled, errors: errors.length ? errors : undefined }
    } catch (error) {
      return {
        success: false,
        scheduled,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      }
    }
  }
}

/**
 * Factory function to create a new MarketingAutomationAgent instance
 */
export function createMarketingAutomationAgent(): MarketingAutomationAgent {
  return new MarketingAutomationAgent()
}

/**
 * Singleton instance of MarketingAutomationAgent
 * Use this for consistent agent state across the application
 */
export const marketingAutomationAgent = new MarketingAutomationAgent()

/**
 * Sends an email immediately via Resend
 */
export async function sendEmailNow(
  email: string,
  subject: string,
  html: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return await sendEmail({ to: email, subject, html })
}

/**
 * Schedules an email to be sent at a specific time
 * Inserts into marketing_email_queue for later processing
 */
export async function scheduleEmail(
  userId: string,
  email: string,
  subject: string,
  html: string,
  scheduledFor: Date,
): Promise<{ success: boolean; error?: string }> {
  try {
    await sql`
      INSERT INTO marketing_email_queue (user_id, email, subject, html, scheduled_for, status)
      VALUES (${userId}, ${email}, ${subject}, ${html}, ${scheduledFor.toISOString()}, 'pending')
    `
    console.log(`[MarketingAgent] Email scheduled for ${email} at ${scheduledFor.toISOString()}`)
    return { success: true }
  } catch (error) {
    console.error("[MarketingAgent] Error scheduling email:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Gets the user segment for a given user
 * Returns 'new', 'active', 'inactive', or 'churned'
 */
export async function getUserSegment(userId: string): Promise<string> {
  try {
    const result = await sql`
      SELECT 
        created_at,
        last_login_at
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `

    if (result.length === 0) return "unknown"

    const user = result[0]
    const now = new Date()
    const createdAt = new Date(user.created_at)
    const daysSinceSignup = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)

    // New user: signed up within last 7 days
    if (daysSinceSignup <= 7) return "new"

    // Check last login
    if (user.last_login_at) {
      const lastLogin = new Date(user.last_login_at)
      const daysSinceLogin = (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)

      if (daysSinceLogin <= 7) return "active"
      if (daysSinceLogin <= 30) return "inactive"
      return "churned"
    }

    return "inactive"
  } catch (error) {
    console.error("[MarketingAgent] Error getting user segment:", error)
    return "unknown"
  }
}

/**
 * Logs an email event for tracking and analytics
 */
export async function logEmailEvent(metadata: {
  userId: string
  emailType: string
  action: string
  details?: Record<string, any>
}): Promise<void> {
  try {
    await sql`
      INSERT INTO email_logs (user_email, email_type, status, sent_at)
      SELECT email, ${metadata.emailType}, 'sent', NOW()
      FROM users
      WHERE id = ${metadata.userId}
    `
    console.log("[MarketingAgent] Email event logged:", metadata)
  } catch (error) {
    console.error("[MarketingAgent] Error logging email event:", error)
  }
}

/**
 * Logs an email open event for analytics tracking
 */
export async function logEmailOpen(event: {
  userId: string
  campaignId: string
  userAgent?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    await sql`
      UPDATE marketing_email_log
      SET opened_at = NOW(),
          user_agent = ${event.userAgent || null}
      WHERE user_id = ${event.userId}
        AND campaign_id = ${event.campaignId}
        AND opened_at IS NULL
    `
    console.log(`[MarketingAgent] Email open logged for campaign ${event.campaignId}`)
    return { success: true }
  } catch (error) {
    console.error("[MarketingAgent] Error logging email open:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Logs an email click event for analytics tracking
 */
export async function logEmailClick(event: {
  userId: string
  campaignId: string
  linkClicked: string
  userAgent?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    await sql`
      UPDATE marketing_email_log
      SET clicked_at = NOW(),
          link_clicked = ${event.linkClicked},
          user_agent = ${event.userAgent || null},
          opened_at = COALESCE(opened_at, NOW())
      WHERE user_id = ${event.userId}
        AND campaign_id = ${event.campaignId}
    `
    console.log(`[MarketingAgent] Email click logged for campaign ${event.campaignId}: ${event.linkClicked}`)
    return { success: true }
  } catch (error) {
    console.error("[MarketingAgent] Error logging email click:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Checks the email queue and sends pending emails if scheduled_for <= now
 * Should be called periodically by a cron job or on agent invocation
 */
export async function checkEmailQueue(): Promise<{
  sent: number
  failed: number
  errors: string[]
}> {
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[],
  }

  try {
    // Get all pending emails that are due
    const pendingEmails = await sql`
      SELECT id, user_id, email, subject, html
      FROM marketing_email_queue
      WHERE status = 'pending'
        AND scheduled_for <= NOW()
      ORDER BY scheduled_for ASC
      LIMIT 50
    `

    console.log(`[MarketingAgent] Found ${pendingEmails.length} pending emails to send`)

    for (const emailRecord of pendingEmails) {
      try {
        // Send the email
        const result = await sendEmail({
          to: emailRecord.email,
          subject: emailRecord.subject,
          html: emailRecord.html,
        })

        if (result.success) {
          // Mark as sent
          await sql`
            UPDATE marketing_email_queue
            SET status = 'sent', sent_at = NOW()
            WHERE id = ${emailRecord.id}
          `
          results.sent++
          console.log(`[MarketingAgent] Email sent to ${emailRecord.email}`)
        } else {
          // Mark as failed
          await sql`
            UPDATE marketing_email_queue
            SET status = 'failed', error_message = ${result.error || "Unknown error"}
            WHERE id = ${emailRecord.id}
          `
          results.failed++
          results.errors.push(`${emailRecord.email}: ${result.error}`)
          console.error(`[MarketingAgent] Failed to send email to ${emailRecord.email}:`, result.error)
        }
      } catch (error) {
        // Mark as failed
        const errorMsg = error instanceof Error ? error.message : "Unknown error"
        await sql`
          UPDATE marketing_email_queue
          SET status = 'failed', error_message = ${errorMsg}
          WHERE id = ${emailRecord.id}
        `
        results.failed++
        results.errors.push(`${emailRecord.email}: ${errorMsg}`)
        console.error(`[MarketingAgent] Error processing email ${emailRecord.id}:`, error)
      }

      // Rate limiting: wait 200ms between sends
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    console.log(`[MarketingAgent] Email queue check complete: ${results.sent} sent, ${results.failed} failed`)
  } catch (error) {
    console.error("[MarketingAgent] Error checking email queue:", error)
    results.errors.push(error instanceof Error ? error.message : "Unknown error")
  }

  return results
}

/**
 * Sends an email to a specific audience segment
 * Placeholder - not yet implemented
 */
export async function sendSegmentEmail() {
  return { status: "not_implemented" }
}

/**
 * Runs an audience segmentation query
 * Placeholder - not yet implemented
 */
export async function runAudienceQuery() {
  return { status: "not_implemented" }
}

/**
 * Sends a personalized user journey email
 * Used by the userJourneyWorkflow for personalized messaging
 */
export async function sendUserJourneyEmail(
  userId: string,
  email: string,
  subject: string,
  html: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[MarketingAgent] Sending user journey email to ${email}`)
    const result = await sendEmail({ to: email, subject, html })

    if (result.success) {
      // Log the event
      await logEmailEvent({
        userId,
        emailType: "user_journey",
        action: "sent",
        details: { subject },
      })
    }

    return result
  } catch (error) {
    console.error("[MarketingAgent] Error sending user journey email:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
