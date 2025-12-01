import { BaseAgent } from "../core/baseAgent"
import type { IAgent } from "../core/agent-interface"
import { generateText } from "ai"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Agent: WinbackAgent
 * 
 * Responsibility:
 *  - Generates personalized winback messages for inactive users (7-14 days)
 *  - Identifies users who have gone inactive
 *  - Tracks winback success rates
 * 
 * Implements:
 *  - IAgent (process, getMetadata)
 * 
 * Usage:
 *  - Called by workflows (winbackWorkflow)
 *  - Called by Admin API (/api/admin/agents/run)
 *  - Input: { action: "generateMessage", params: { userId, daysSinceLastActivity, lastActivity } }
 * 
 * Notes:
 *  - Uses OpenAI GPT-4o for message generation
 *  - Returns structured { subject, body } format
 */
export class WinbackAgent extends BaseAgent implements IAgent {
  constructor() {
    super({
      name: "Winback",
      description: "Automated winback and reactivation agent for inactive users",
      systemPrompt: `You are the Winback Agent for SSELFIE.

Your mission:
- Identify users who have gone inactive (7-14 days no activity)
- Generate personalized reactivation messages that speak to their specific challenges
- Use empathy and understanding, never guilt or pressure
- Highlight new features, improvements, or success stories that might re-engage them

Winback Strategy:
- Day 7: "We miss you" - soft reminder with value highlight
- Day 10: "New features you haven't seen" - feature announcement
- Day 14: "Final check-in" - last attempt with special offer

Critical Rules:
- NEVER modify Maya or user-facing features
- NEVER spam or send multiple emails in short succession
- ALWAYS personalize based on user's last activity
- Use Sandra's warm, empowering tone

Tone: Warm, understanding, non-pushy, value-focused.`,
      tools: {},
      model: "openai/gpt-4o",
    })
  }

  async generateWinbackMessage(params: {
    userId: string
    daysSinceLastActivity: number
    lastActivity: string
  }): Promise<{ subject: string; body: string }> {
    try {
      const prompt = `Generate a personalized winback email for a user who hasn't been active for ${params.daysSinceLastActivity} days.

Last known activity: ${params.lastActivity}

Create:
1. A compelling subject line (max 60 chars)
2. A warm, personalized email body (200-300 words)

The email should:
- Acknowledge their absence without making them feel guilty
- Highlight what they're missing
- Include a clear, simple CTA to come back
- Use Sandra's authentic, empowering tone

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
      console.log(`[WinbackAgent] Generated winback message for user ${params.userId}`)
      return parsed
    } catch (error) {
      console.error("[WinbackAgent] Error generating winback message:", error)
      // Fallback message
      return {
        subject: "We miss you at SSELFIE",
        body: `Hi there,

I noticed you haven't been around lately, and I wanted to reach out.

Building your personal brand is a journey, and it's okay to take breaks. But I don't want you to miss out on what's new.

Ready to jump back in? We're here when you are.

- Sandra & the SSELFIE team`,
      }
    }
  }

  /**
   * Run agent logic - internal method
   * @param input - Agent input: { action: "generateMessage", params: {...} } or unknown
   * @returns Promise resolving to winback message or agent output
   */
  async run(input: unknown): Promise<unknown> {
    if (
      typeof input === "object" &&
      input !== null &&
      "action" in input &&
      input.action === "generateMessage" &&
      "params" in input &&
      input.params
    ) {
      return await this.generateWinbackMessage(input.params as {
        userId: string
        daysSinceLastActivity: number
        lastActivity: string
      })
    }
    // Default: return input as-is
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

export function createWinbackAgent(): WinbackAgent {
  return new WinbackAgent()
}

export const winbackAgent = new WinbackAgent()
