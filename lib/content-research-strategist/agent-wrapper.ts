import { BaseAgent } from "@/agents/core/baseAgent"
import type { IAgent } from "@/agents/core/agent-interface"
import { CONTENT_RESEARCH_STRATEGIST_PROMPT } from "./personality"
import { conductContentResearch } from "./research-logic"
import type { ContentResearchParams } from "./types"

/**
 * Agent: ContentResearchStrategistAgent
 * 
 * Responsibility:
 *  - Conducts research on Instagram trends, hashtags, and content strategies
 *  - Wraps conductContentResearch function for agent ecosystem consistency
 * 
 * Implements:
 *  - IAgent (process, getMetadata)
 * 
 * Usage:
 *  - Called by workflows and Admin API (/api/admin/agents/run)
 *  - Input: { params: { niche, brandProfile } } or params directly
 * 
 * Notes:
 *  - Uses Claude Sonnet 4.5 for research analysis
 *  - Returns ResearchResult with trends, hashtags, content ideas
 */
export class ContentResearchStrategistAgent extends BaseAgent implements IAgent {
  constructor() {
    super({
      name: "ContentResearchStrategist",
      description:
        "Expert Content Research Strategist who conducts research on Instagram trends, hashtags, and content strategies for specific niches.",
      systemPrompt: CONTENT_RESEARCH_STRATEGIST_PROMPT,
      tools: {},
      model: "anthropic/claude-sonnet-4.5",
    })
  }

  /**
   * Run agent logic - internal method
   */
  async run(input: unknown): Promise<unknown> {
    if (
      typeof input === "object" &&
      input !== null &&
      "params" in input &&
      input.params
    ) {
      return await conductContentResearch(input.params as ContentResearchParams)
    }
    // If input is the params directly
    if (
      typeof input === "object" &&
      input !== null &&
      "niche" in input &&
      "brandProfile" in input
    ) {
      return await conductContentResearch(input as ContentResearchParams)
    }
    return {
      success: false,
      error: "Missing required parameters: niche, brandProfile",
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
 * Factory function to create ContentResearchStrategistAgent
 */
export function createContentResearchStrategistAgent(): ContentResearchStrategistAgent {
  return new ContentResearchStrategistAgent()
}

/**
 * Singleton instance for use across the application
 */
export const contentResearchStrategistAgent = new ContentResearchStrategistAgent()

