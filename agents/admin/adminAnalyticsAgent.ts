import { BaseAgent } from "../core/baseAgent"
import type { IAgent } from "../core/agent-interface"
import { analyticsTools } from "../tools/analyticsTools"

/**
 * Agent: AdminAnalyticsAgent
 * 
 * Responsibility:
 *  - Generates weekly analytics summaries
 *  - Assembles platform-wide statistics
 *  - Builds data summaries from Neon SQL queries
 *  - Caches insights for performance
 * 
 * Implements:
 *  - IAgent (process, getMetadata)
 * 
 * Usage:
 *  - Called by AdminSupervisorAgent
 *  - Called by Admin API (/api/admin/agents/run)
 *  - Uses tools: analyticsTools
 * 
 * Notes:
 *  - ADMIN ONLY - never expose to regular users
 *  - Extracted from AdminSupervisorAgent for single responsibility
 */
export class AdminAnalyticsAgent extends BaseAgent implements IAgent {
  constructor() {
    super({
      name: "AdminAnalytics",
      description:
        "Admin analytics agent responsible for generating insights, assembling stats, and building data summaries for business intelligence.",
      systemPrompt: `You are the Admin Analytics Agent for the SSELFIE platform.

Your responsibilities:
- Generate weekly analytics summaries
- Assemble platform-wide statistics
- Build data summaries from Neon SQL queries
- Cache insights for performance
- Provide actionable business intelligence

Critical Rules:
- ADMIN ONLY - never expose to regular users
- NEVER modify Maya or user-facing features
- ALWAYS cache insights for performance
- Provide clear, data-driven recommendations

Tone: Analytical, strategic, data-driven.`,
      tools: analyticsTools,
      model: "anthropic/claude-sonnet-4",
    })
  }

  /**
   * Run agent logic - internal method
   */
  async run(input: unknown): Promise<unknown> {
    // AdminAnalyticsAgent uses tools for analytics operations
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

/**
 * Factory function to create AdminAnalyticsAgent
 */
export function createAdminAnalyticsAgent(): AdminAnalyticsAgent {
  return new AdminAnalyticsAgent()
}

/**
 * Singleton instance for use across the application
 */
export const adminAnalyticsAgent = new AdminAnalyticsAgent()

