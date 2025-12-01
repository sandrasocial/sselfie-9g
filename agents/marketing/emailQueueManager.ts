import { BaseAgent } from "../core/baseAgent"
import type { IAgent } from "../core/agent-interface"
import { sendEmail } from "@/lib/email/resend"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Agent: EmailQueueManager
 * 
 * Responsibility:
 *  - Enqueues emails for scheduled sending
 *  - Dequeues and processes pending emails
 *  - Validates email content and scheduling
 *  - Handles retry logic for failed sends
 * 
 * Implements:
 *  - IAgent (process, getMetadata)
 * 
 * Usage:
 *  - Called by MarketingAutomationAgent
 *  - Called by Admin API (/api/admin/agents/run)
 *  - Input: { action: "schedule" | "checkQueue", params: {...} }
 * 
 * Notes:
 *  - Extracted from MarketingAutomationAgent for single responsibility
 *  - Manages marketing_email_queue table
 */
export class EmailQueueManager extends BaseAgent implements IAgent {
  constructor() {
    super({
      name: "EmailQueueManager",
      description:
        "Manages the email queue: scheduling, sending, retry logic, and error handling for marketing emails.",
      systemPrompt: `You are the Email Queue Manager for the SSELFIE platform.

Your responsibilities:
- Enqueue emails for scheduled sending
- Dequeue and process pending emails
- Validate email content and scheduling
- Handle retry logic for failed sends
- Manage queue state persistence
- Track email delivery status

Critical Rules:
- NEVER modify Maya or user-facing features
- ALWAYS validate email content before queuing
- ALWAYS handle errors gracefully
- ALWAYS log queue operations for debugging

Tone: Systematic, reliable, detail-oriented.`,
      tools: {},
      model: "anthropic/claude-sonnet-4",
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
        if (input.action === "schedule" && "params" in input) {
          const params = input.params as any
          return await this.scheduleEmail(
            params.userId,
            params.email,
            params.subject,
            params.html,
            params.scheduledFor instanceof Date
              ? params.scheduledFor
              : new Date(params.scheduledFor),
          )
        }
        if (input.action === "checkQueue") {
          return await this.checkEmailQueue()
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
    }
  }

  /**
   * Schedules an email to be sent at a specific time
   * Inserts into marketing_email_queue for later processing
   */
  async scheduleEmail(
    userId: string,
    email: string,
    subject: string,
    html: string,
    scheduledFor: Date,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate inputs
      if (!userId || !email || !subject || !html) {
        return {
          success: false,
          error: "Missing required fields: userId, email, subject, or html",
        }
      }

      if (!email.includes("@")) {
        return {
          success: false,
          error: "Invalid email format",
        }
      }

      if (scheduledFor < new Date()) {
        return {
          success: false,
          error: "Scheduled time must be in the future",
        }
      }

      // Insert into queue
      await sql`
        INSERT INTO marketing_email_queue (user_id, email, subject, html, scheduled_for, status)
        VALUES (${userId}, ${email}, ${subject}, ${html}, ${scheduledFor.toISOString()}, 'pending')
      `

      this.log("info", `Email scheduled for ${email} at ${scheduledFor.toISOString()}`)
      return { success: true }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      this.log("error", `Error scheduling email: ${errorMsg}`)
      return {
        success: false,
        error: errorMsg,
      }
    }
  }

  /**
   * Checks the email queue and sends pending emails if scheduled_for <= now
   * Should be called periodically by a cron job or on agent invocation
   */
  async checkEmailQueue(): Promise<{
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

      this.log("info", `Found ${pendingEmails.length} pending emails to send`)

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
            this.log("info", `Email sent to ${emailRecord.email}`)
          } else {
            // Mark as failed
            await sql`
              UPDATE marketing_email_queue
              SET status = 'failed', error_message = ${result.error || "Unknown error"}
              WHERE id = ${emailRecord.id}
            `
            results.failed++
            results.errors.push(`${emailRecord.email}: ${result.error}`)
            this.log("error", `Failed to send email to ${emailRecord.email}: ${result.error}`)
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
          this.log("error", `Error processing email ${emailRecord.id}: ${errorMsg}`)
        }

        // Rate limiting: wait 200ms between sends
        await new Promise((resolve) => setTimeout(resolve, 200))
      }

      this.log("info", `Email queue check complete: ${results.sent} sent, ${results.failed} failed`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      this.log("error", `Error checking email queue: ${errorMsg}`)
      results.errors.push(errorMsg)
    }

    return results
  }

  /**
   * Structured logging helper
   */
  private log(level: "info" | "error", message: string): void {
    const timestamp = new Date().toISOString()
    const tag = `[${this.name}]`
    const logMessage = `${timestamp} ${tag} ${message}`
    if (level === "error") {
      console.error(logMessage)
    } else {
      console.log(logMessage)
    }
  }
}

/**
 * Factory function to create EmailQueueManager
 */
export function createEmailQueueManager(): EmailQueueManager {
  return new EmailQueueManager()
}

/**
 * Singleton instance for use across the application
 */
export const emailQueueManager = new EmailQueueManager()

// Export convenience functions for backwards compatibility
export async function scheduleEmail(
  userId: string,
  email: string,
  subject: string,
  html: string,
  scheduledFor: Date,
): Promise<{ success: boolean; error?: string }> {
  return emailQueueManager.scheduleEmail(userId, email, subject, html, scheduledFor)
}

export async function checkEmailQueue(): Promise<{
  sent: number
  failed: number
  errors: string[]
}> {
  return emailQueueManager.checkEmailQueue()
}

