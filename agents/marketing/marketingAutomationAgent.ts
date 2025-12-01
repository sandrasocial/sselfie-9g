import { BaseAgent } from "../core/baseAgent"
import type { IAgent } from "../core/agent-interface"
import { emailTools } from "../tools/emailTools"
import { analyticsTools } from "../tools/analyticsTools"
import { contentTools } from "../tools/contentTools"
import { audienceTools } from "../tools/audienceTools"
import { sendEmail } from "@/lib/email/resend"
// Lazy import to avoid circular dependencies
let emailQueueManager: any = null
let emailSequenceAgent: any = null

function getEmailQueueManager() {
  if (!emailQueueManager) {
    emailQueueManager = require("./emailQueueManager").emailQueueManager
  }
  return emailQueueManager
}

function getEmailSequenceAgent() {
  if (!emailSequenceAgent) {
    emailSequenceAgent = require("./emailSequenceAgent").emailSequenceAgent
  }
  return emailSequenceAgent
}
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

const allTools = {
  ...emailTools,
  ...analyticsTools,
  ...contentTools,
  ...audienceTools,
}

/**
 * Agent: MarketingAutomationAgent
 * 
 * Responsibility:
 *  - High-level marketing orchestration
 *  - Decides which campaigns or sequences to run
 *  - Delegates queue operations to EmailQueueManager
 *  - Delegates sequence operations to EmailSequenceAgent
 * 
 * Implements:
 *  - IAgent (process, getMetadata)
 * 
 * Usage:
 *  - Called by marketing workflows
 *  - Called by Admin API (/api/admin/agents/run)
 *  - Input: { action: "runApprovedWorkflow" | "startBlueprintFollowUp", ... }
 * 
 * Notes:
 *  - Uses tools: emailTools, analyticsTools, contentTools, audienceTools
 *  - Orchestrates but doesn't implement queue/sequence logic directly
 */
export class MarketingAutomationAgent extends BaseAgent implements IAgent {
  constructor() {
    super({
      name: "MarketingAutomation",
      description:
        "Automated marketing agent responsible for email flows, content generation, retention and growth tasks. Orchestrates campaigns and delegates to specialized agents.",
      systemPrompt: `You are the Marketing Automation Agent for the SSELFIE platform.
Your job is to automate all marketing, communication, retention, and growth activities for Sandra.

Your capabilities:
- Generate newsletters, email campaigns, subject lines, and announcements.
- Create Instagram captions, reel scripts, hooks, and content ideas.
- Run retention workflows using segmentation tools.
- Trigger onboarding, upsell, and winback sequences.
- Write personalized emails and content using Sandra's brand voice.
- Call the correct tools when needed (emailTools, contentTools, analyticsTools, audienceTools).
- Delegate queue operations to EmailQueueManager
- Delegate sequence operations to EmailSequenceAgent

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
- Delegate queue management to EmailQueueManager
- Delegate sequence management to EmailSequenceAgent
- If missing data, request it from the AdminSupervisorAgent rather than guessing.

Primary Mission:
Automate SSELFIE's marketing system at scale: email flows, retention, newsletters, IG content, and user communication.`,
      tools: allTools,
    })
  }

  /**
   * Run agent logic - internal method with retry for recoverable errors
   */
  async run(input: unknown): Promise<unknown> {
    const { retryWithBackoff, isRecoverable } = await import("@/agents/monitoring/alerts")

    const execute = async () => {
      if (
        typeof input === "object" &&
        input !== null &&
        "action" in input &&
        typeof input.action === "string"
      ) {
        if (input.action === "runApprovedWorkflow" && "workflow" in input) {
          return await this.runApprovedWorkflow(input.workflow as any)
        }
        if (input.action === "startBlueprintFollowUp" && "params" in input) {
          const params = input.params as any
          return await this.startBlueprintFollowUpWorkflow(
            params.subscriberId,
            params.email,
            params.name,
          )
        }
      }
      return input
    }

    try {
      return await execute()
    } catch (error) {
      // Retry if recoverable
      if (isRecoverable(error)) {
        return await retryWithBackoff(execute, 3, 1000)
      }
      throw error
    }
  }

  /**
   * Get agent metadata
   */
  getMetadata() {
    return {
      name: this.name,
      version: "1.0.0",
      description: this.description,
      critical: true, // Mark as critical for alerts
    }
  }

  /**
   * Access to EmailQueueManager for queue operations
   */
  get queueManager() {
    return getEmailQueueManager()
  }

  /**
   * Access to EmailSequenceAgent for sequence operations
   */
  get sequenceAgent() {
    return getEmailSequenceAgent()
  }

  /**
   * Execute an approved workflow from the queue
   * Delegates to EmailQueueManager for scheduling
   */
  async runApprovedWorkflow(workflow: any): Promise<{ success: boolean; error?: string }> {
    try {
      const subject = `[${workflow.workflow_type}] Update for ${workflow.subscriber_email}`
      const html =
        `<p>Hello ${workflow.subscriber_name || ""},</p>` +
        `<p>Your ${workflow.workflow_type.replace("_", " ")} workflow has been approved.</p>`

      // Schedule email using EmailQueueManager
      const scheduledFor = new Date()
      const queueManager = getEmailQueueManager()
      const result = await queueManager.scheduleEmail(
        workflow.subscriber_id,
        workflow.subscriber_email,
        subject,
        html,
        scheduledFor,
      )
      return result
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
  }

  /**
   * Schedule the 3-step blueprint follow-up sequence using the queue
   * Delegates to EmailQueueManager for scheduling
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

      // Schedule each email using EmailQueueManager
      for (const step of sequences) {
        const queueManager = getEmailQueueManager()
      const result = await queueManager.scheduleEmail(
          String(subscriberId),
          email,
          step.subject,
          step.html,
          step.when,
        )
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
 * Created lazily to avoid circular dependency issues
 */
let _marketingAutomationAgentInstance: MarketingAutomationAgent | null = null

export function getMarketingAutomationAgent(): MarketingAutomationAgent {
  if (!_marketingAutomationAgentInstance) {
    _marketingAutomationAgentInstance = new MarketingAutomationAgent()
  }
  return _marketingAutomationAgentInstance
}

// Export the singleton - but make it lazy by using a function that returns the instance
// This prevents circular dependency issues at module load time
// The registry will access this property, which will trigger the getter
export const marketingAutomationAgent = (() => {
  // Don't create instance at module load - return a proxy that creates it on first access
  return getMarketingAutomationAgent()
})()

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

// Re-export queue functions for backwards compatibility
export { scheduleEmail, checkEmailQueue } from "./emailQueueManager"

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
