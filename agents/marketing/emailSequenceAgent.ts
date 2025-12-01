import { BaseAgent } from "../core/baseAgent"
import type { IAgent } from "../core/agent-interface"
import {
  getNextEmailToSend,
  getSequenceStatus,
  logEmailSend,
  hasReceivedEmail,
  getTimeSinceLastEmail,
  getEligibleUsers,
  type EmailSequenceStatus,
} from "@/lib/data/email-sequence"
import { sendSequenceEmail, type SendSequenceEmailResult } from "@/lib/email/send-sequence-email"

/**
 * Agent: EmailSequenceAgent
 * 
 * Responsibility:
 *  - Determines next step in email sequence (1-8)
 *  - Runs sequence steps at the right time
 *  - Tracks sequence progress and completion
 *  - Integrates with email sequence database helpers
 * 
 * Implements:
 *  - IAgent (process, getMetadata)
 * 
 * Usage:
 *  - Called by MarketingAutomationAgent
 *  - Called by Admin API (/api/admin/agents/run)
 *  - Input: { action: "getNextStep" | "runStep" | "markComplete" | "getStatus" | "getEligible", params: {...} }
 * 
 * Notes:
 *  - Extracted from MarketingAutomationAgent for single responsibility
 *  - Respects 24-hour minimum spacing between emails
 *  - Integrates with lib/data/email-sequence.ts and lib/email/send-sequence-email.ts
 */
export class EmailSequenceAgent extends BaseAgent implements IAgent {
  constructor() {
    super({
      name: "EmailSequenceAgent",
      description:
        "Manages email sequences: step progression, scheduling, determining next steps, and sequence state persistence.",
      systemPrompt: `You are the Email Sequence Agent for the SSELFIE platform.

Your responsibilities:
- Determine the next step in a sequence for a user
- Run sequence steps at the right time
- Track sequence progress and completion
- Integrate with email sequence database helpers
- Schedule sequence emails appropriately

Critical Rules:
- NEVER modify Maya or user-facing features
- ALWAYS check sequence eligibility before sending
- ALWAYS respect 24-hour minimum spacing between emails
- ALWAYS log sequence progress accurately

Tone: Systematic, patient, sequence-aware.`,
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
        if (input.action === "getNextStep" && "params" in input) {
          const params = input.params as any
          return await this.getNextStep(params.userId, params.email)
        }
        if (input.action === "runStep" && "params" in input) {
          const params = input.params as any
          return await this.runSequenceStep(params.userId, params.email, params.step)
        }
        if (input.action === "markComplete" && "params" in input) {
          const params = input.params as any
          return await this.markStepComplete(
            params.userId,
            params.email,
            params.step,
            params.messageId,
          )
        }
        if (input.action === "getStatus" && "params" in input) {
          const params = input.params as any
          return await this.getSequenceStatus(params.userId, params.email)
        }
        if (input.action === "getEligible") {
          return await this.getEligibleUsers()
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
   * Get the next step that should be sent to a user
   * @param userId - User ID (can be null)
   * @param email - User email address
   * @returns Next step number (1-8) or null if sequence complete or not eligible
   */
  async getNextStep(userId: string | null, email: string): Promise<number | null> {
    try {
      this.log("info", `Getting next step for ${email}`)
      const nextStep = await getNextEmailToSend(userId, email)
      if (nextStep) {
        this.log("info", `Next step for ${email}: ${nextStep}`)
      } else {
        this.log("info", `No next step for ${email} (sequence complete or not eligible)`)
      }
      return nextStep
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      this.log("error", `Error getting next step for ${email}: ${errorMsg}`)
      return null
    }
  }

  /**
   * Run a specific sequence step for a user
   * @param userId - User ID (can be null)
   * @param email - User email address
   * @param step - Step number (1-8)
   * @returns Result of sending the email
   */
  async runSequenceStep(
    userId: string | null,
    email: string,
    step: number,
  ): Promise<SendSequenceEmailResult> {
    try {
      // Validate step
      if (step < 1 || step > 8) {
        const error = `Invalid step: ${step}. Must be between 1 and 8.`
        this.log("error", error)
        return { success: false, error }
      }

      // Check if step was already sent
      const alreadyReceived = await hasReceivedEmail(userId, email, step)
      if (alreadyReceived) {
        this.log("info", `Step ${step} already sent to ${email}, skipping`)
        return { success: true, messageId: "already_sent" }
      }

      // Check timing (24 hours minimum between emails)
      const timeSinceLastEmail = await getTimeSinceLastEmail(userId, email)
      if (timeSinceLastEmail) {
        const now = new Date()
        const hoursSinceLastEmail =
          (now.getTime() - timeSinceLastEmail.getTime()) / (1000 * 60 * 60)
        if (hoursSinceLastEmail < 24) {
          const error = `Not enough time since last email (${hoursSinceLastEmail.toFixed(1)} hours, need 24)`
          this.log("info", error)
          return { success: false, error }
        }
      }

      // Send the sequence email
      this.log("info", `Running sequence step ${step} for ${email}`)
      const result = await sendSequenceEmail({
        email,
        userId,
        step,
      })

      if (result.success) {
        this.log("info", `Successfully sent step ${step} to ${email}`)
      } else {
        this.log("error", `Failed to send step ${step} to ${email}: ${result.error}`)
      }

      return result
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      this.log("error", `Error running sequence step ${step} for ${email}: ${errorMsg}`)
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Mark a sequence step as complete
   * Note: This is handled automatically by sendSequenceEmail, but provided for explicit marking
   * @param userId - User ID (can be null)
   * @param email - User email address
   * @param step - Step number (1-8)
   * @param messageId - Optional message ID from email service
   */
  async markStepComplete(
    userId: string | null,
    email: string,
    step: number,
    messageId?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const logged = await logEmailSend(userId, email, step, messageId)
      if (logged) {
        this.log("info", `Marked step ${step} as complete for ${email}`)
        return { success: true }
      } else {
        return { success: false, error: "Failed to log email send" }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      this.log("error", `Error marking step complete: ${errorMsg}`)
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Get complete sequence status for a user
   * @param userId - User ID (can be null)
   * @param email - User email address
   * @returns Sequence status object
   */
  async getSequenceStatus(userId: string | null, email: string): Promise<EmailSequenceStatus> {
    try {
      return await getSequenceStatus(userId, email)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      this.log("error", `Error getting sequence status: ${errorMsg}`)
      return {
        userId,
        email,
        currentStep: null,
        lastEmailSentAt: null,
        nextEmailDueAt: null,
        completed: false,
      }
    }
  }

  /**
   * Get all users who are eligible for the next email in sequence
   * @returns Array of eligible users with their next step
   */
  async getEligibleUsers(): Promise<Array<{ userId: string | null; email: string; nextStep: number }>> {
    try {
      this.log("info", "Getting eligible users for sequence")
      const eligible = await getEligibleUsers()
      this.log("info", `Found ${eligible.length} eligible users`)
      return eligible
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      this.log("error", `Error getting eligible users: ${errorMsg}`)
      return []
    }
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
 * Factory function to create EmailSequenceAgent
 */
export function createEmailSequenceAgent(): EmailSequenceAgent {
  return new EmailSequenceAgent()
}

/**
 * Singleton instance for use across the application
 */
export const emailSequenceAgent = new EmailSequenceAgent()

