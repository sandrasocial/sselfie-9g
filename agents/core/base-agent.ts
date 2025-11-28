/**
 * Base Agent Class
 * Foundation for all specialized agents
 */

import type { AgentConfig, AgentContext, AgentResponse, Message } from "./types"

export abstract class BaseAgent {
  protected config: AgentConfig

  constructor(config: AgentConfig) {
    this.config = config
  }

  /**
   * Process a user message and return a response
   */
  abstract process(message: string, context: AgentContext): Promise<AgentResponse>

  /**
   * Stream a response (for real-time chat)
   */
  abstract stream(message: string, context: AgentContext): AsyncIterable<string>

  /**
   * Get the agent's configuration
   */
  getConfig(): AgentConfig {
    return this.config
  }

  /**
   * Update the agent's system prompt
   */
  updateSystemPrompt(prompt: string): void {
    this.config.systemPrompt = prompt
  }

  /**
   * Register a new tool
   */
  registerTool(tool: any): void {
    if (!this.config.tools) {
      this.config.tools = []
    }
    this.config.tools.push(tool)
  }

  /**
   * Format conversation history for the model
   */
  protected formatHistory(messages: Message[]): any[] {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }))
  }

  /**
   * Extract user context for personalization
   */
  protected extractContext(context: AgentContext): string {
    const { userProfile } = context
    if (!userProfile) return ""

    return `
User Profile:
- Name: ${userProfile.name || "Not provided"}
- Brand Voice: ${userProfile.brandVoice || "Not defined"}
- Target Audience: ${userProfile.targetAudience || "Not defined"}
- Content Pillars: ${userProfile.contentPillars?.join(", ") || "None"}
- Instagram Handle: ${userProfile.instagramHandle || "Not provided"}
`.trim()
  }
}
