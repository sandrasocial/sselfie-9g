import { BaseAgent } from "@/agents/core/baseAgent"
import type { IAgent } from "@/agents/core/agent-interface"
import { INSTAGRAM_BIO_STRATEGIST_PERSONALITY } from "./personality"
import { generateInstagramBio } from "./bio-logic"

/**
 * Agent: InstagramBioStrategistAgent
 * 
 * Responsibility:
 *  - Generates high-converting, searchable Instagram bios
 *  - Wraps generateInstagramBio function for agent ecosystem consistency
 * 
 * Implements:
 *  - IAgent (process, getMetadata)
 * 
 * Usage:
 *  - Called by workflows and Admin API (/api/admin/agents/run)
 *  - Input: { params: { userId, businessType, brandVibe, ... } } or params directly
 * 
 * Notes:
 *  - Uses OpenAI GPT-4o for bio generation
 *  - Returns { success, bio, error }
 */
export class InstagramBioStrategistAgent extends BaseAgent implements IAgent {
  constructor() {
    super({
      name: "InstagramBioStrategist",
      description:
        "Expert Instagram Bio Strategist who writes high-converting, searchable Instagram bios that convert visitors into followers and followers into customers.",
      systemPrompt: INSTAGRAM_BIO_STRATEGIST_PERSONALITY,
      tools: {},
      model: "openai/gpt-4o",
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
      return await generateInstagramBio(input.params as any)
    }
    // If input is the params directly
    if (
      typeof input === "object" &&
      input !== null &&
      "userId" in input &&
      "businessType" in input &&
      "brandVibe" in input
    ) {
      return await generateInstagramBio(input as any)
    }
    return {
      success: false,
      error: "Missing required parameters: userId, businessType, brandVibe",
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
 * Factory function to create InstagramBioStrategistAgent
 */
export function createInstagramBioStrategistAgent(): InstagramBioStrategistAgent {
  return new InstagramBioStrategistAgent()
}

/**
 * Singleton instance for use across the application
 */
export const instagramBioStrategistAgent = new InstagramBioStrategistAgent()

