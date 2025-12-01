import { BaseAgent } from "../core/baseAgent"
import type { IAgent } from "../core/agent-interface"
import { emailTools } from "../tools/emailTools"
import { analyticsTools } from "../tools/analyticsTools"
import { contentTools } from "../tools/contentTools"
import { audienceTools } from "../tools/audienceTools"
import * as AdminWorkflowTrigger from "./adminWorkflowTrigger"
import { adminAnalyticsAgent } from "./adminAnalyticsAgent"

const allTools = {
  ...emailTools,
  ...analyticsTools,
  ...contentTools,
  ...audienceTools,
}

/**
 * Agent: AdminSupervisorAgent
 * 
 * Responsibility:
 *  - Top-level supervisor for SSELFIE administrative automation
 *  - Orchestrates high-level business operations
 *  - Delegates to AdminWorkflowTrigger and AdminAnalyticsAgent
 *  - Makes strategic decisions based on analytics
 * 
 * Implements:
 *  - IAgent (process, getMetadata)
 * 
 * Usage:
 *  - Called by admin chat interface
 *  - Called by Admin API (/api/admin/agents/run)
 *  - Uses tools: emailTools, analyticsTools, contentTools, audienceTools
 * 
 * Notes:
 *  - ADMIN ONLY - never expose to regular users
 *  - Delegates workflow triggers to AdminWorkflowTrigger
 *  - Delegates analytics to AdminAnalyticsAgent
 */
export class AdminSupervisorAgent extends BaseAgent implements IAgent {
  constructor() {
    super({
      name: "AdminSupervisor",
      description:
        "Top-level supervisor agent for SSELFIE administrative automation. Orchestrates business management, delegates to specialized agents, and makes strategic decisions.",
      systemPrompt: `You are the Admin Supervisor Agent for the SSELFIE platform. Your role is to act as Sandra's internal COO and strategic automation brain.

Your responsibilities:
- Orchestrate high-level business operations
- Delegate tasks to specialized agents (AdminWorkflowTrigger, AdminAnalyticsAgent)
- Monitor user behavior via analytics tools
- Identify trends in activation, engagement, churn risk, and revenue
- Determine when to run marketing workflows, then delegate to the MarketingAutomationAgent
- Make strategic decisions based on analytics and audience segmentation
- Decide which tool to use and when to call it
- Output clear reasoning and structured results

Critical rules:
- NEVER attempt to modify or interfere with Maya or any user-facing flows
- NEVER attempt to generate images, photoshoots, videos, or concepts. Those belong to Maya
- ONLY use the tools mounted to you
- Delegate workflow triggers to AdminWorkflowTrigger
- Delegate analytics operations to AdminAnalyticsAgent
- If a tool is missing or unsupported, respond with a safe fallback message
- You are not a user-facing agent. You only assist Sandra internally

Tone:
Professional, concise, analytical, strategic. No emojis.`,
      tools: allTools,
      model: "anthropic/claude-sonnet-4",
    })
  }

  /**
   * Run agent logic - internal method
   */
  async run(input: unknown): Promise<unknown> {
    // AdminSupervisorAgent uses tools and delegates to specialized agents
    // Default: return input as-is (tool-based agents handle differently)
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
      critical: true, // Mark as critical for alerts
    }
  }

  /**
   * Delegate workflow triggering to AdminWorkflowTrigger
   */
  get workflowTrigger() {
    return AdminWorkflowTrigger
  }

  /**
   * Delegate analytics operations to AdminAnalyticsAgent
   */
  get analytics() {
    return adminAnalyticsAgent
  }
}

/**
 * Factory function to create AdminSupervisorAgent
 */
export function createAdminSupervisorAgent(): AdminSupervisorAgent {
  return new AdminSupervisorAgent()
}

/**
 * Singleton instance for use across the application
 */
export const adminSupervisorAgent = new AdminSupervisorAgent()

// Re-export workflow trigger functions for backwards compatibility
export {
  triggerOnboardingWorkflow,
  triggerRetentionWorkflow,
  triggerNewsletterWorkflow,
  triggerAnnouncementWorkflow,
  triggerAnalyticsWorkflow,
  triggerContentWorkflow,
  triggerJourneyWorkflow,
  triggerFeedDesignerWorkflow,
  triggerAutoPostingWorkflow,
  triggerFeedPerformanceWorkflow,
  triggerLeadMagnetWorkflow,
  triggerWinbackWorkflow,
  triggerChurnPreventionWorkflow,
  triggerUpgradeWorkflow,
  triggerSalesDashboardWorkflow,
} from "./adminWorkflowTrigger"

// Minimal placeholders for legacy imports expected by various routes
export async function getTopEngagedUsers() {
  return { users: [], status: "not_implemented" }
}
export async function getDropoffSignals() {
  return { signals: [], status: "not_implemented" }
}
export async function generateSystemRecommendations() {
  return { recommendations: [], status: "not_implemented" }
}
export async function runEngagementScoring() {
  return { status: "not_implemented" }
}
export async function evaluateAPAForSubscriber() {
  return { status: "not_implemented" }
}
export async function runNightlyAPA() {
  return { status: "not_implemented" }
}
export async function getSubscribersNeedingPrediction() {
  return { subscribers: [], status: "not_implemented" }
}
export async function evaluateConversionLikelihood() {
  return { status: "not_implemented" }
}
export async function computeOfferPathway() {
  return { success: false, recommendation: null, rationale: "not_implemented", confidence: 0 }
}
export async function runABEvaluation() {
  return { status: "not_implemented" }
}
