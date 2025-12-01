import { PipelineOrchestrator } from "@/agents/orchestrator/pipeline"
import type { PipelineStep } from "@/agents/orchestrator/types"
import { AgentRegistry } from "@/agents/core/agent-registry"

/**
 * Upgrade Pipeline
 * Purpose: Identify users ready to upgrade → send tailored message → follow-up sequence
 * 
 * Steps:
 * 1. Detect upgrade opportunity
 * 2. Generate upgrade message
 * 3. Schedule email
 * 4. Run blueprint follow-up sequence
 * 
 * Input: { userId: string }
 */
export function createUpgradePipeline(input: { userId: string }) {
  const upgradeAgent = AgentRegistry.get("UpgradeAgent")
  const emailQueueManager = AgentRegistry.get("EmailQueueManager")
  const emailSequenceAgent = AgentRegistry.get("EmailSequenceAgent")

  if (!upgradeAgent) {
    throw new Error("UpgradeAgent not found in registry")
  }
  if (!emailQueueManager) {
    throw new Error("EmailQueueManager not found in registry")
  }
  if (!emailSequenceAgent) {
    throw new Error("EmailSequenceAgent not found in registry")
  }

  // Safety: Block Maya
  if (upgradeAgent.getMetadata().name.toLowerCase().includes("maya")) {
    throw new Error("Maya cannot be used in pipelines")
  }

  const steps: PipelineStep[] = [
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
        return { ...context, upgradeOpportunity: result }
      },
    },
    {
      name: "generate-upgrade-message",
      agent: upgradeAgent,
      run: async (context) => {
        if (!context.upgradeOpportunity || !context.upgradeOpportunity.recommended) {
          throw new Error("No upgrade opportunity detected")
        }
        const result = await upgradeAgent.process({
          action: "generateMessage",
          params: {
            userId: input.userId,
            reason: context.upgradeOpportunity.reason || "usage-based",
            currentPlan: context.upgradeOpportunity.currentPlan || "free",
            recommendedPlan: context.upgradeOpportunity.recommendedPlan || "pro",
          },
        })
        return { ...context, upgradeMessage: result }
      },
    },
    {
      name: "schedule-email",
      agent: emailQueueManager,
      run: async (context) => {
        if (!context.upgradeMessage || !context.upgradeMessage.body) {
          throw new Error("Upgrade message not generated")
        }
        const result = await emailQueueManager.process({
          action: "schedule",
          params: {
            userId: input.userId,
            email: "",
            subject: context.upgradeMessage.subject || "Ready to scale?",
            html: context.upgradeMessage.body,
            scheduledFor: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
          },
        })
        return { ...context, scheduledEmail: result }
      },
    },
    {
      name: "run-blueprint-followup",
      agent: emailSequenceAgent,
      run: async (context) => {
        const result = await emailSequenceAgent.process({
          action: "runStep",
          params: {
            userId: input.userId,
            email: "",
            step: 1,
          },
        })
        return { ...context, blueprintFollowup: result }
      },
    },
  ]

  return new PipelineOrchestrator(steps)
}

