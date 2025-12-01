import { BaseAgent } from "../core/baseAgent"
import type { IAgent } from "../core/agent-interface"
import { generateText } from "ai"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Agent: ChurnPreventionAgent
 * 
 * Responsibility:
 *  - Handles subscription lifecycle events (payment_failed, renewal_upcoming, cancellation, downgrade)
 *  - Generates retention messages with empathy
 *  - Logs subscription events for tracking
 * 
 * Implements:
 *  - IAgent (process, getMetadata)
 * 
 * Usage:
 *  - Called by workflows (churnPreventionWorkflow)
 *  - Called by Admin API (/api/admin/agents/run)
 *  - Input: { action: "logEvent" | "generateMessage", params: {...} }
 * 
 * Notes:
 *  - Uses OpenAI GPT-4o for retention message generation
 *  - Event types: payment_failed, renewal_upcoming, cancellation, downgrade
 */
export class ChurnPreventionAgent extends BaseAgent implements IAgent {
  constructor() {
    super({
      name: "ChurnPrevention",
      description: "Automated churn prevention and subscription health monitoring agent",
      systemPrompt: `You are the Churn Prevention Agent for SSELFIE.

Your mission:
- Monitor subscription health and payment status
- Intervene before users churn with personalized outreach
- Handle payment failures with empathy and clear guidance
- Offer retention incentives when appropriate

Event Types You Handle:
- payment_failed: Help users update payment method
- renewal_upcoming: Remind users of renewal, highlight value
- cancellation: Last-ditch retention offer
- downgrade: Understand why, offer alternatives

Critical Rules:
- NEVER modify Maya or user-facing features
- NEVER be pushy or aggressive
- ALWAYS provide clear action steps
- Use empathy, especially for payment issues

Tone: Understanding, helpful, solution-oriented, never desperate.`,
      tools: {},
      model: "openai/gpt-4o",
    })
  }

  async logSubscriptionEvent(params: {
    userId: string
    eventType: "payment_failed" | "renewal_upcoming" | "cancellation" | "downgrade"
    metadata?: Record<string, any>
  }): Promise<{ success: boolean; eventId?: string }> {
    try {
      const result = await sql`
        INSERT INTO subscription_events (user_id, event_type, event_time, metadata)
        VALUES (${params.userId}, ${params.eventType}, NOW(), ${JSON.stringify(params.metadata || {})})
        RETURNING id
      `
      console.log(`[ChurnPreventionAgent] Logged ${params.eventType} event for user ${params.userId}`)
      return { success: true, eventId: result[0].id }
    } catch (error) {
      console.error("[ChurnPreventionAgent] Error logging subscription event:", error)
      return { success: false }
    }
  }

  async generateRetentionMessage(params: {
    userId: string
    eventType: string
    userPlan: string
  }): Promise<{ subject: string; body: string }> {
    try {
      const prompt = `Generate a retention email for a subscription event.

Event Type: ${params.eventType}
User Plan: ${params.userPlan}

Create a personalized message that:
- Addresses the specific event with empathy
- Provides clear next steps
- Highlights the value they'd lose
- Offers help or alternatives if appropriate

Format as JSON:
{
  "subject": "...",
  "body": "..."
}`

      const result = await generateText({
        model: "openai/gpt-4o",
        prompt,
      })

      const parsed = JSON.parse(result.text)
      console.log(`[ChurnPreventionAgent] Generated retention message for ${params.eventType}`)
      return parsed
    } catch (error) {
      console.error("[ChurnPreventionAgent] Error generating retention message:", error)
      return {
        subject: "Quick question about your SSELFIE account",
        body: "We noticed something with your subscription. Let's get it sorted quickly.",
      }
    }
  }

  /**
   * Run agent logic - internal method
   */
  async run(input: unknown): Promise<unknown> {
    if (
      typeof input === "object" &&
      input !== null &&
      "action" in input &&
      typeof input.action === "string" &&
      "params" in input &&
      input.params
    ) {
      if (input.action === "logEvent") {
        return await this.logSubscriptionEvent(input.params as any)
      }
      if (input.action === "generateMessage") {
        return await this.generateRetentionMessage(input.params as any)
      }
    }
    return input
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
}

export function createChurnPreventionAgent(): ChurnPreventionAgent {
  return new ChurnPreventionAgent()
}

export const churnPreventionAgent = new ChurnPreventionAgent()
