import { PipelineOrchestrator } from "@/agents/orchestrator/pipeline"
import type { PipelineStep } from "@/agents/orchestrator/types"
import { AgentRegistry } from "@/agents/core/agent-registry"

/**
 * Revenue Recovery Pipeline
 * Purpose: Handle winback, upgrade, and abandoned checkout scenarios
 * 
 * Steps (varies by type):
 * - Winback: Generate message → Schedule email
 * - Upgrade: Detect opportunity → Generate message → Schedule email
 * - Abandoned Checkout: Generate message → Schedule email
 * 
 * Input: { type: "winback" | "upgrade" | "abandoned_checkout", userId: string, email: string, context?: any }
 */
export function createRevenueRecoveryPipeline(input: {
  type: "winback" | "upgrade" | "abandoned_checkout"
  userId: string
  email: string
  context?: any
}) {
  const winbackAgent = AgentRegistry.get("WinbackAgent")
  const upgradeAgent = AgentRegistry.get("UpgradeAgent")
  const churnAgent = AgentRegistry.get("ChurnPreventionAgent")
  const emailQueueManager = AgentRegistry.get("EmailQueueManager")

  if (!winbackAgent || !upgradeAgent || !churnAgent || !emailQueueManager) {
    throw new Error("Required agents not found in registry")
  }

  // Safety: Block Maya
  if (winbackAgent.getMetadata().name.toLowerCase().includes("maya")) {
    throw new Error("Maya cannot be used in pipelines")
  }

  const steps: PipelineStep[] = []

  if (input.type === "winback") {
    steps.push(
      {
        name: "generate-winback-message",
        agent: winbackAgent,
        run: async (context) => {
          const result = await winbackAgent.process({
            action: "generateMessage",
            params: {
              userId: input.userId,
              daysSinceLastActivity: input.context?.daysSinceLastActivity || 7,
              lastActivity: input.context?.lastActivity || "image upload",
            },
          })
          return { ...context, message: result }
        },
      },
      {
        name: "schedule-winback-email",
        agent: emailQueueManager,
        run: async (context) => {
          if (!context.message || !context.message.body) {
            throw new Error("Winback message not generated")
          }
          const result = await emailQueueManager.process({
            action: "schedule",
            params: {
              userId: input.userId,
              email: input.email,
              subject: context.message.subject || "We miss you at SSELFIE",
              html: context.message.body,
              scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
            },
          })
          return { ...context, scheduledEmail: result }
        },
      },
    )
  } else if (input.type === "upgrade") {
    steps.push(
      {
        name: "detect-upgrade-opportunity",
        agent: upgradeAgent,
        run: async (context) => {
          const result = await upgradeAgent.process({
            action: "detectOpportunity",
            params: {
              userId: input.userId,
            },
          })
          return { ...context, opportunity: result }
        },
      },
      {
        name: "generate-upgrade-message",
        agent: upgradeAgent,
        run: async (context) => {
          if (!context.opportunity || !context.opportunity.shouldUpgrade) {
            throw new Error("No upgrade opportunity detected")
          }
          const result = await upgradeAgent.process({
            action: "generateMessage",
            params: {
              userId: input.userId,
              reason: context.opportunity.reason || "High usage detected",
              currentPlan: "free",
              recommendedPlan: context.opportunity.recommendedPlan || "SSELFIE Studio",
            },
          })
          return { ...context, message: result }
        },
      },
      {
        name: "schedule-upgrade-email",
        agent: emailQueueManager,
        run: async (context) => {
          if (!context.message || !context.message.body) {
            throw new Error("Upgrade message not generated")
          }
          const result = await emailQueueManager.process({
            action: "schedule",
            params: {
              userId: input.userId,
              email: input.email,
              subject: context.message.subject || "Ready to scale your content?",
              html: context.message.body,
              scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            },
          })
          return { ...context, scheduledEmail: result }
        },
      },
    )
  } else if (input.type === "abandoned_checkout") {
    steps.push(
      {
        name: "generate-churn-prevention-message",
        agent: churnAgent,
        run: async (context) => {
          const result = await churnAgent.process({
            action: "generateMessage",
            params: {
              userId: input.userId,
              eventType: "abandoned_checkout",
              productType: input.context?.productType || "unknown",
              checkoutSessionId: input.context?.checkoutSessionId,
            },
          })
          return { ...context, message: result }
        },
      },
      {
        name: "schedule-recovery-email",
        agent: emailQueueManager,
        run: async (context) => {
          if (!context.message || !context.message.body) {
            throw new Error("Recovery message not generated")
          }
          const result = await emailQueueManager.process({
            action: "schedule",
            params: {
              userId: input.userId,
              email: input.email,
              subject: context.message.subject || "Complete your purchase",
              html: context.message.body,
              scheduledFor: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), // 1 hour
            },
          })
          return { ...context, scheduledEmail: result }
        },
      },
    )
  }

  if (steps.length === 0) {
    throw new Error(`Invalid recovery type: ${input.type}`)
  }

  return new PipelineOrchestrator(steps)
}

