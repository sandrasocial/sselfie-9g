import { BaseAgent } from "../core/baseAgent"
import type { IAgent } from "../core/agent-interface"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Agent: LeadMagnetAgent
 * 
 * Responsibility:
 *  - Delivers lead magnets to new users (PDF guides, templates, challenges)
 *  - Tracks engagement (opens, clicks, conversions)
 *  - Analyzes lead magnet performance
 * 
 * Implements:
 *  - IAgent (process, getMetadata)
 * 
 * Usage:
 *  - Called by workflows (leadMagnetWorkflow)
 *  - Called by Admin API (/api/admin/agents/run)
 *  - Input: { action: "deliver" | "trackOpen" | "trackClick" | "trackConversion", params: {...} }
 * 
 * Notes:
 *  - Lead magnet types: Instagram Feed Blueprint, 7-Day Photo Challenge, Content Calendar Template
 */
export class LeadMagnetAgent extends BaseAgent implements IAgent {
  constructor() {
    super({
      name: "LeadMagnet",
      description: "Automated lead magnet delivery and conversion tracking agent",
      systemPrompt: `You are the Lead Magnet Agent for SSELFIE.

Your mission:
- Deliver high-quality lead magnets to attract and convert new users
- Track open rates, click rates, and conversion events
- Optimize lead magnet copy and delivery timing
- Analyze which lead magnets drive the most conversions

Lead Magnet Types:
- Instagram Feed Blueprint (PDF guide)
- 7-Day Photo Challenge
- Content Calendar Template
- Caption Formula Swipe File

Critical Rules:
- NEVER modify Maya or user-facing features
- ONLY deliver lead magnets, never spam
- ALWAYS track engagement metrics
- Personalize content based on user signup source

Tone: Warm, helpful, value-driven, no hard selling.`,
      tools: {},
      model: "openai/gpt-4o",
    })
  }

  async deliverLeadMagnet(params: {
    userId: string
    magnetType: string
    userEmail: string
  }): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[LeadMagnetAgent] Delivering ${params.magnetType} to ${params.userEmail}`)

      // Log delivery
      await sql`
        INSERT INTO lead_magnet_activity (user_id, magnet_type, delivered_at)
        VALUES (${params.userId}, ${params.magnetType}, NOW())
      `

      return { success: true }
    } catch (error) {
      console.error("[LeadMagnetAgent] Error delivering lead magnet:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async trackOpen(params: {
    userId: string
    magnetType: string
  }): Promise<{ success: boolean }> {
    try {
      await sql`
        UPDATE lead_magnet_activity
        SET opened_at = NOW()
        WHERE user_id = ${params.userId}
          AND magnet_type = ${params.magnetType}
          AND opened_at IS NULL
      `
      console.log(`[LeadMagnetAgent] Tracked open for ${params.magnetType}`)
      return { success: true }
    } catch (error) {
      console.error("[LeadMagnetAgent] Error tracking open:", error)
      return { success: false }
    }
  }

  async trackClick(params: {
    userId: string
    magnetType: string
  }): Promise<{ success: boolean }> {
    try {
      await sql`
        UPDATE lead_magnet_activity
        SET clicked_at = NOW(), opened_at = COALESCE(opened_at, NOW())
        WHERE user_id = ${params.userId}
          AND magnet_type = ${params.magnetType}
      `
      console.log(`[LeadMagnetAgent] Tracked click for ${params.magnetType}`)
      return { success: true }
    } catch (error) {
      console.error("[LeadMagnetAgent] Error tracking click:", error)
      return { success: false }
    }
  }

  async trackConversion(params: {
    userId: string
    magnetType: string
  }): Promise<{ success: boolean }> {
    try {
      await sql`
        UPDATE lead_magnet_activity
        SET converted_to_signup_at = NOW()
        WHERE user_id = ${params.userId}
          AND magnet_type = ${params.magnetType}
          AND converted_to_signup_at IS NULL
      `
      console.log(`[LeadMagnetAgent] Tracked conversion for ${params.magnetType}`)
      return { success: true }
    } catch (error) {
      console.error("[LeadMagnetAgent] Error tracking conversion:", error)
      return { success: false }
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
      const params = input.params as any
      if (input.action === "deliver") {
        return await this.deliverLeadMagnet(params)
      }
      if (input.action === "trackOpen") {
        return await this.trackOpen(params)
      }
      if (input.action === "trackClick") {
        return await this.trackClick(params)
      }
      if (input.action === "trackConversion") {
        return await this.trackConversion(params)
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

export function createLeadMagnetAgent(): LeadMagnetAgent {
  return new LeadMagnetAgent()
}

export const leadMagnetAgent = new LeadMagnetAgent()
