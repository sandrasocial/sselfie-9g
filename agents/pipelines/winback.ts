import { PipelineOrchestrator } from "@/agents/orchestrator/pipeline"
import type { PipelineStep } from "@/agents/orchestrator/types"
import { AgentRegistry } from "@/agents/core/agent-registry"

/**
 * Winback Pipeline
 * Purpose: Re-engage inactive subscribers with a personalized winback message
 * 
 * Steps:
 * 1. Generate winback message
 * 2. Schedule email
 * 3. Run email sequence step
 * 
 * Input: { userId: string }
 */
export function createWinbackPipeline(input: { userId: string }) {
  const winbackAgent = AgentRegistry.get("WinbackAgent")
  const emailQueueManager = AgentRegistry.get("EmailQueueManager")
  const emailSequenceAgent = AgentRegistry.get("EmailSequenceAgent")

  if (!winbackAgent) {
    throw new Error("WinbackAgent not found in registry")
  }
  if (!emailQueueManager) {
    throw new Error("EmailQueueManager not found in registry")
  }
  if (!emailSequenceAgent) {
    throw new Error("EmailSequenceAgent not found in registry")
  }

  // Safety: Block Maya
  if (winbackAgent.getMetadata().name.toLowerCase().includes("maya")) {
    throw new Error("Maya cannot be used in pipelines")
  }

  const steps: PipelineStep[] = [
    {
      name: "generate-winback-message",
      agent: winbackAgent,
      run: async (context) => {
        const result = await winbackAgent.process({
          action: "generateMessage",
          params: {
            userId: input.userId,
            daysSinceLastActivity: 7,
            lastActivity: "login",
          },
        })
        return { ...context, winbackMessage: result }
      },
    },
    {
      name: "schedule-email",
      agent: emailQueueManager,
      run: async (context) => {
        if (!context.winbackMessage || !context.winbackMessage.body) {
          throw new Error("Winback message not generated")
        }
        const result = await emailQueueManager.process({
          action: "schedule",
          params: {
            userId: input.userId,
            email: "", // Will be fetched from user data
            subject: context.winbackMessage.subject || "We miss you!",
            html: context.winbackMessage.body,
            scheduledFor: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 hour from now
          },
        })
        return { ...context, scheduledEmail: result }
      },
    },
    {
      name: "run-sequence-step",
      agent: emailSequenceAgent,
      run: async (context) => {
        const result = await emailSequenceAgent.process({
          action: "runStep",
          params: {
            userId: input.userId,
            email: "", // Will be fetched from user data
            step: 1,
          },
        })
        return { ...context, sequenceStep: result }
      },
    },
  ]

  return new PipelineOrchestrator(steps)
}

