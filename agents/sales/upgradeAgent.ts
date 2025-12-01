import { BaseAgent } from "../core/baseAgent"
import type { IAgent } from "../core/agent-interface"
import { generateText } from "ai"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Agent: UpgradeAgent
 * 
 * Responsibility:
 *  - Detects upgrade opportunities based on usage patterns
 *  - Generates personalized upgrade recommendations
 *  - Tracks upgrade conversion rates
 * 
 * Implements:
 *  - IAgent (process, getMetadata)
 * 
 * Usage:
 *  - Called by workflows (upgradeWorkflow)
 *  - Called by Admin API (/api/admin/agents/run)
 *  - Input: { action: "detectOpportunity" | "generateMessage", params: {...} }
 * 
 * Notes:
 *  - Analyzes credit usage, feature usage, and behavioral signals
 *  - Uses OpenAI GPT-4o for message generation
 */
export class UpgradeAgent extends BaseAgent implements IAgent {
  constructor() {
    super({
      name: "Upgrade",
      description: "Automated upgrade recommendation and conversion agent",
      systemPrompt: `You are the Upgrade Agent for SSELFIE.

Your mission:
- Identify users who would benefit from upgrading
- Create personalized upgrade recommendations based on usage patterns
- Time upgrade prompts at optimal moments (not during frustration)
- Highlight the transformation and value of upgrading

Upgrade Triggers:
- High credit usage (running low frequently)
- Heavy feature user (using Maya, Feed Planner, videos daily)
- Behavioral signals (creating content for clients, business growth)
- Milestone achievements (100th image, first carousel)

Critical Rules:
- NEVER modify Maya or user-facing features
- NEVER pressure or guilt users into upgrading
- ALWAYS tie upgrade to user's specific goals and usage
- Use value-based messaging, not feature lists

Tone: Empowering, aspirational, value-focused, never salesy.`,
      tools: {},
      model: "openai/gpt-4o",
    })
  }

  async detectUpgradeOpportunity(params: {
    userId: string
  }): Promise<{
    shouldUpgrade: boolean
    reason?: string
    recommendedPlan?: string
  }> {
    try {
      // Check user's activity and usage patterns
      const userData = await sql`
        SELECT 
          u.plan,
          uc.balance as credit_balance,
          COUNT(DISTINCT mc.id) as maya_chats,
          COUNT(DISTINCT gi.id) as images_generated,
          COUNT(DISTINCT fl.id) as feed_layouts
        FROM users u
        LEFT JOIN user_credits uc ON u.id = uc.user_id
        LEFT JOIN maya_chats mc ON u.id = mc.user_id AND mc.created_at > NOW() - INTERVAL '30 days'
        LEFT JOIN generated_images gi ON u.id = gi.user_id AND gi.created_at > NOW() - INTERVAL '30 days'
        LEFT JOIN feed_layouts fl ON u.id = fl.user_id
        WHERE u.id = ${params.userId}
        GROUP BY u.id, u.plan, uc.balance
      `

      if (userData.length === 0) {
        return { shouldUpgrade: false }
      }

      const user = userData[0]

      // Logic: Upgrade if credits are low AND high usage
      if (user.credit_balance < 20 && user.images_generated > 50 && user.maya_chats > 10) {
        return {
          shouldUpgrade: true,
          reason: "High usage with low credits",
          recommendedPlan: "SSELFIE Studio",
        }
      }

      // Logic: Upgrade if using multiple features heavily
      if (user.maya_chats > 20 && user.feed_layouts > 1 && user.images_generated > 100) {
        return {
          shouldUpgrade: true,
          reason: "Power user across multiple features",
          recommendedPlan: "SSELFIE Studio",
        }
      }

      return { shouldUpgrade: false }
    } catch (error) {
      console.error("[UpgradeAgent] Error detecting upgrade opportunity:", error)
      return { shouldUpgrade: false }
    }
  }

  async generateUpgradeMessage(params: {
    userId: string
    reason: string
    currentPlan: string
    recommendedPlan: string
  }): Promise<{ subject: string; body: string }> {
    try {
      const prompt = `Generate a personalized upgrade recommendation email.

Current Plan: ${params.currentPlan}
Recommended Plan: ${params.recommendedPlan}
Reason: ${params.reason}

Create an email that:
- Celebrates their current progress and usage
- Shows how upgrading solves their specific need
- Highlights transformation, not just features
- Includes clear pricing and CTA

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
      console.log(`[UpgradeAgent] Generated upgrade message for user ${params.userId}`)
      return parsed
    } catch (error) {
      console.error("[UpgradeAgent] Error generating upgrade message:", error)
      return {
        subject: "Ready to scale your content?",
        body: "You've been creating amazing content. Let's talk about taking it to the next level.",
      }
    }
  }

  /**
   * Run agent logic - internal method
   * @param input - Agent input: { action: "detectOpportunity" | "generateMessage", params: {...} } or unknown
   * @returns Promise resolving to upgrade analysis or message
   */
  async run(input: unknown): Promise<unknown> {
    if (
      typeof input === "object" &&
      input !== null &&
      "action" in input &&
      "params" in input &&
      input.params
    ) {
      if (input.action === "detectOpportunity") {
        return await this.detectUpgradeOpportunity(input.params as { userId: string })
      }
      if (input.action === "generateMessage") {
        return await this.generateUpgradeMessage(input.params as {
          userId: string
          reason: string
          currentPlan: string
          recommendedPlan: string
        })
      }
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

export function createUpgradeAgent(): UpgradeAgent {
  return new UpgradeAgent()
}

export const upgradeAgent = new UpgradeAgent()
