/**
 * Agent Factory
 * Creates and configures agents based on role
 */

import type { AgentConfig, AgentRole } from "./types"

export class AgentFactory {
  /**
   * Create an agent configuration by role
   */
  static createConfig(role: AgentRole): AgentConfig {
    const configs: Record<AgentRole, Partial<AgentConfig>> = {
      content_researcher: {
        name: "Content Research Specialist",
        model: "anthropic/claude-sonnet-4",
        temperature: 0.7,
        systemPrompt: "You are a content research specialist...",
      },
      brand_strategist: {
        name: "Personal Brand Strategist",
        model: "anthropic/claude-sonnet-4",
        temperature: 0.8,
        systemPrompt: "You are a personal brand strategist...",
      },
      caption_writer: {
        name: "Caption Writer",
        model: "openai/gpt-4o",
        temperature: 0.9,
        systemPrompt: "You are an expert Instagram caption writer...",
      },
      visual_stylist: {
        name: "Visual Stylist",
        model: "openai/gpt-4o",
        temperature: 0.8,
        systemPrompt: "You are a visual styling expert...",
      },
      email_marketer: {
        name: "Email Marketing Specialist",
        model: "anthropic/claude-sonnet-4",
        temperature: 0.7,
        systemPrompt: "You are an email marketing specialist...",
      },
      admin_assistant: {
        name: "Admin Assistant",
        model: "anthropic/claude-sonnet-4",
        temperature: 0.6,
        systemPrompt: "You are Sandra's AI business assistant...",
      },
      analytics_advisor: {
        name: "Analytics Advisor",
        model: "openai/gpt-4o",
        temperature: 0.5,
        systemPrompt: "You are a data analytics advisor...",
      },
    }

    const baseConfig = configs[role]
    return {
      id: `${role}-${Date.now()}`,
      role,
      ...baseConfig,
    } as AgentConfig
  }
}
