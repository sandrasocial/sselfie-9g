import { BaseAgent } from "@/agents/core/baseAgent"
import type { IAgent } from "@/agents/core/agent-interface"
import { PERSONAL_BRAND_STRATEGIST_PROMPT } from "./personality"

/**
 * Agent: PersonalBrandStrategistAgent
 * 
 * Responsibility:
 *  - Wraps Personal Brand Strategist functionality for agent ecosystem consistency
 *  - Provides IAgent interface for orchestration
 * 
 * Implements:
 *  - IAgent (process, getMetadata)
 * 
 * Usage:
 *  - Called by Admin API (/api/admin/agents/run)
 *  - Note: Actual strategist is accessed via /api/personal-brand-strategist/strategy (streaming)
 * 
 * Notes:
 *  - This is a wrapper - actual functionality uses API route with streamText
 *  - Returns status message directing to API route
 */
export class PersonalBrandStrategistAgent extends BaseAgent implements IAgent {
  constructor() {
    super({
      name: "PersonalBrandStrategist",
      description:
        "Expert Personal Brand Strategist specializing in helping entrepreneurs, creators, and professionals build powerful, authentic personal brands on Instagram and social media.",
      systemPrompt: PERSONAL_BRAND_STRATEGIST_PROMPT,
      tools: {},
      model: "anthropic/claude-sonnet-4",
    })
  }

  /**
   * Run agent logic - internal method
   * Note: The actual strategist is called via API route with streamText
   */
  async run(input: unknown): Promise<unknown> {
    // The PersonalBrandStrategist is primarily used via API route
    // This run method provides a standard interface
    // For direct usage, the API route should be called
    return {
      status: "use_api_route",
      message: "PersonalBrandStrategist is accessed via /api/personal-brand-strategist/strategy",
      input,
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
}

/**
 * Factory function to create PersonalBrandStrategistAgent
 */
export function createPersonalBrandStrategistAgent(): PersonalBrandStrategistAgent {
  return new PersonalBrandStrategistAgent()
}

/**
 * Singleton instance for use across the application
 */
export const personalBrandStrategistAgent = new PersonalBrandStrategistAgent()

