/**
 * Agent Registry
 * Central registry of all active agents in the system
 * Enables lookup, listing, and safe instantiation
 */

import type { IAgent } from "./agent-interface"

// Content Agents
import { dailyContentAgent } from "../content/dailyContentAgent"
import { feedDesignerAgent } from "../content/feedDesignerAgent"
import { autoPostingAgent } from "../content/autoPostingAgent"
import { feedPerformanceAgent } from "../content/feedPerformanceAgent"

// Admin Agents
import { adminSupervisorAgent } from "../admin/adminSupervisorAgent"
import { adminAnalyticsAgent } from "../admin/adminAnalyticsAgent"
import { salesDashboardAgent } from "../admin/salesDashboardAgent"

// Marketing Agents - Use lazy imports to avoid circular dependencies
let marketingAutomationAgent: any = null
let emailQueueManager: any = null
let emailSequenceAgent: any = null

function getMarketingAutomationAgent() {
  if (!marketingAutomationAgent) {
    try {
      // IMPORTANT: Use dynamic import to get the actual .ts file
      // Webpack resolves to .tsx which doesn't export the agent class/instance
      // We need to import the .ts file directly
      const modulePath = "../marketing/marketingAutomationAgent"
      
      // Try to require - webpack might resolve to .tsx, so we need to handle that
      let module: any
      try {
        module = require(modulePath)
      } catch (requireError) {
        console.error("[AgentRegistry] require() failed, trying alternative:", requireError)
        throw requireError
      }
      
      // Debug: log what exports are available
      const exports = Object.keys(module || {})
      console.log(`[AgentRegistry] MarketingAutomationAgent module exports:`, exports.slice(0, 15))
      
      // Prefer the factory function to avoid any circular issues
      if (module.getMarketingAutomationAgent && typeof module.getMarketingAutomationAgent === 'function') {
        marketingAutomationAgent = module.getMarketingAutomationAgent()
        console.log("[AgentRegistry] Loaded MarketingAutomationAgent via factory function")
      } else if (module.marketingAutomationAgent) {
        // Fallback to the exported instance
        marketingAutomationAgent = module.marketingAutomationAgent
        console.log("[AgentRegistry] Loaded MarketingAutomationAgent via exported instance")
      } else if (module.MarketingAutomationAgent && typeof module.MarketingAutomationAgent === 'function') {
        // Last resort: create new instance directly
        marketingAutomationAgent = new module.MarketingAutomationAgent()
        console.log("[AgentRegistry] Loaded MarketingAutomationAgent via class constructor")
      } else {
        // If we still can't find it, try importing the class directly and creating instance
        if (module.MarketingAutomationAgent) {
          const MarketingAutomationAgentClass = module.MarketingAutomationAgent
          marketingAutomationAgent = new MarketingAutomationAgentClass()
          console.log("[AgentRegistry] Loaded MarketingAutomationAgent via direct class instantiation")
        } else {
          const availableExports = exports.join(", ")
          throw new Error(`No valid export found for MarketingAutomationAgent. Available: ${availableExports}`)
        }
      }
      
      // Validate the agent has required methods
      if (!marketingAutomationAgent) {
        throw new Error("MarketingAutomationAgent is null or undefined after loading")
      }
      
      if (typeof marketingAutomationAgent.getMetadata !== 'function') {
        throw new Error("MarketingAutomationAgent missing getMetadata method")
      }
      
      if (typeof marketingAutomationAgent.process !== 'function') {
        throw new Error("MarketingAutomationAgent missing process method")
      }
      
      // Test that getMetadata works
      try {
        const metadata = marketingAutomationAgent.getMetadata()
        if (!metadata || !metadata.name) {
          throw new Error("MarketingAutomationAgent.getMetadata() returned invalid metadata")
        }
        console.log(`[AgentRegistry] MarketingAutomationAgent validated: ${metadata.name}`)
      } catch (metadataError) {
        throw new Error(`MarketingAutomationAgent.getMetadata() failed: ${metadataError instanceof Error ? metadataError.message : String(metadataError)}`)
      }
      
    } catch (error) {
      console.error("[AgentRegistry] Error loading MarketingAutomationAgent:", error)
      if (error instanceof Error && error.stack) {
        console.error("[AgentRegistry] Stack trace:", error.stack)
      }
      marketingAutomationAgent = null
    }
  }
  return marketingAutomationAgent
}

function getEmailQueueManager() {
  if (!emailQueueManager) {
    try {
      emailQueueManager = require("../marketing/emailQueueManager").emailQueueManager
      if (!emailQueueManager || typeof emailQueueManager.getMetadata !== 'function') {
        console.error("[AgentRegistry] EmailQueueManager failed to load correctly")
        emailQueueManager = null
      }
    } catch (error) {
      console.error("[AgentRegistry] Error loading EmailQueueManager:", error)
      emailQueueManager = null
    }
  }
  return emailQueueManager
}

function getEmailSequenceAgent() {
  if (!emailSequenceAgent) {
    try {
      emailSequenceAgent = require("../marketing/emailSequenceAgent").emailSequenceAgent
      if (!emailSequenceAgent || typeof emailSequenceAgent.getMetadata !== 'function') {
        console.error("[AgentRegistry] EmailSequenceAgent failed to load correctly")
        emailSequenceAgent = null
      }
    } catch (error) {
      console.error("[AgentRegistry] Error loading EmailSequenceAgent:", error)
      emailSequenceAgent = null
    }
  }
  return emailSequenceAgent
}

// Sales Agents
import { winbackAgent } from "../sales/winbackAgent"
import { upgradeAgent } from "../sales/upgradeAgent"
import { churnPreventionAgent } from "../sales/churnPreventionAgent"
import { leadMagnetAgent } from "../sales/leadMagnetAgent"

// Strategist Agents
import { personalBrandStrategistAgent } from "@/lib/personal-brand-strategist/agent-wrapper"
import { instagramBioStrategistAgent } from "@/lib/instagram-bio-strategist/agent-wrapper"
import { contentResearchStrategistAgent } from "@/lib/content-research-strategist/agent-wrapper"
import { instagramStrategyAgent } from "@/lib/feed-planner/instagram-strategy-agent"

/**
 * Agent Registry
 * Provides centralized access to all agents
 */
export const AgentRegistry = {
  get agents() {
    // Lazy load agents object to avoid circular dependencies at module load time
    return {
      // Content Agents
      DailyContentAgent: dailyContentAgent,
      FeedDesignerAgent: feedDesignerAgent,
      AutoPostingAgent: autoPostingAgent,
      FeedPerformanceAgent: feedPerformanceAgent,

      // Admin Agents
      AdminSupervisorAgent: adminSupervisorAgent,
      AdminAnalyticsAgent: adminAnalyticsAgent,
      SalesDashboardAgent: salesDashboardAgent,

      // Marketing Agents - Lazy loaded to avoid circular dependencies
      MarketingAutomationAgent: getMarketingAutomationAgent(),
      EmailQueueManager: getEmailQueueManager(),
      EmailSequenceAgent: getEmailSequenceAgent(),

      // Sales Agents
      WinbackAgent: winbackAgent,
      UpgradeAgent: upgradeAgent,
      ChurnPreventionAgent: churnPreventionAgent,
      LeadMagnetAgent: leadMagnetAgent,

      // Strategist Agents
      PersonalBrandStrategistAgent: personalBrandStrategistAgent,
      InstagramBioStrategistAgent: instagramBioStrategistAgent,
      ContentResearchStrategistAgent: contentResearchStrategistAgent,
      InstagramStrategyAgent: instagramStrategyAgent,
    } as Record<string, IAgent>
  },

  /**
   * List all registered agent names
   */
  list(): string[] {
    return Object.keys(this.agents)
  },

  /**
   * Get an agent by name
   * Returns null if agent not found or invalid
   */
  get(name: string): IAgent | null {
    try {
      const agent = this.agents[name]
      // Safety guard: ensure agent has required methods
      if (!agent || typeof agent.process !== 'function' || typeof agent.getMetadata !== 'function') {
        console.warn(`[AgentRegistry] Agent ${name} is invalid or missing required methods`)
        return null
      }
      return agent
    } catch (error) {
      console.error(`[AgentRegistry] Error getting agent ${name}:`, error)
      return null
    }
  },

  /**
   * Check if an agent exists
   */
  has(name: string): boolean {
    return name in this.agents
  },

  /**
   * Get metadata for all agents
   * Safely handles undefined/null agents and errors
   */
  getAllMetadata() {
    return Object.entries(this.agents)
      .map(([name, agent]) => {
        try {
          // Safety guard: skip if agent is null/undefined or missing required methods
          if (!agent || typeof agent.getMetadata !== 'function') {
            console.warn(`[AgentRegistry] Agent ${name} is invalid or missing getMetadata method`)
            return {
              name,
              status: "error",
              error: "Agent failed to load or is invalid",
            }
          }
          return {
            name,
            metadata: agent.getMetadata(),
          }
        } catch (error) {
          console.error(`[AgentRegistry] Error getting metadata for ${name}:`, error)
          return {
            name,
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          }
        }
      })
      .filter(Boolean) // Remove any null entries
  },
}

