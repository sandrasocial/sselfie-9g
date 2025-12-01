import { BaseAgent } from "../core/baseAgent"
import type { IAgent } from "../core/agent-interface"

/**
 * Agent: AutoPostingAgent
 * 
 * Responsibility:
 *  - Monitors scheduled feed posts and queues them for publishing
 *  - Validates post readiness (image URL, caption, scheduled time)
 *  - Handles posting errors and retry logic
 *  - Updates post status after successful publication
 * 
 * Implements:
 *  - IAgent (process, getMetadata)
 * 
 * Usage:
 *  - Called by workflows (autoPostingWorkflow)
 *  - Called by Admin API (/api/admin/agents/run)
 * 
 * Notes:
 *  - Currently a stub implementation
 *  - Will integrate with Instagram API when implemented
 */
export class AutoPostingAgent extends BaseAgent implements IAgent {
  constructor() {
    super({
      name: "AutoPosting",
      description:
        "Automated Instagram Posting Agent. Manages post queue, scheduling, and publishing automation for user feeds.",
      systemPrompt: `You are the Auto-Posting Agent for SSELFIE.

Your role:
- Monitor scheduled feed posts and queue them for publishing
- Validate post readiness (image URL, caption, scheduled time)
- Handle posting errors and retry logic
- Update post status after successful publication
- Log all posting activities

Guidelines:
- NEVER post without user's scheduled time confirmation
- Validate all content before queuing
- Handle Instagram API errors gracefully
- Maintain accurate post status tracking
- Respect user's timezone preferences

Critical Safety Rules:
- DO NOT modify Maya or user-facing features
- DO NOT alter feed_posts table schema
- ONLY update posting-related fields (posted_at, status)
- Log all actions for admin review

Tone: Systematic, reliable, detail-oriented.`,
      tools: [],
      model: "anthropic/claude-sonnet-4",
    })
  }

  /**
   * Run agent logic - internal method
   */
  async run(input: unknown): Promise<unknown> {
    // Stub implementation - not yet fully implemented
    return { status: "not_implemented", message: "AutoPostingAgent is a stub" }
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
 * Factory function
 */
export function createAutoPostingAgent(): AutoPostingAgent {
  return new AutoPostingAgent()
}

/**
 * Singleton instance
 */
export const autoPostingAgent = new AutoPostingAgent()
