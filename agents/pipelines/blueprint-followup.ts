import { PipelineOrchestrator } from "@/agents/orchestrator/pipeline"
import type { PipelineStep } from "@/agents/orchestrator/types"
import { AgentRegistry } from "@/agents/core/agent-registry"

/**
 * Blueprint Follow-Up Pipeline
 * Purpose: After a user downloads a blueprint → follow up with a nurturing sequence
 * 
 * Steps:
 * 1. Get next sequence step
 * 2. Run sequence step
 * 3. Mark step complete
 * 4. Schedule email
 * 
 * Input: { userId: string, email: string }
 */
export function createBlueprintFollowupPipeline(input: { userId: string; email: string }) {
  const emailSequenceAgent = AgentRegistry.get("EmailSequenceAgent")
  const emailQueueManager = AgentRegistry.get("EmailQueueManager")

  if (!emailSequenceAgent) {
    throw new Error("EmailSequenceAgent not found in registry")
  }
  if (!emailQueueManager) {
    throw new Error("EmailQueueManager not found in registry")
  }

  // Safety: Block Maya
  if (emailSequenceAgent.getMetadata().name.toLowerCase().includes("maya")) {
    throw new Error("Maya cannot be used in pipelines")
  }

  const steps: PipelineStep[] = [
    {
      name: "get-next-step",
      agent: emailSequenceAgent,
      run: async (context) => {
        const result = await emailSequenceAgent.process({
          action: "getNextStep",
          params: {
            userId: input.userId,
            email: input.email,
          },
        })
        return { ...context, nextStep: result }
      },
    },
    {
      name: "run-sequence-step",
      agent: emailSequenceAgent,
      run: async (context) => {
        if (!context.nextStep || !context.nextStep.step) {
          throw new Error("No next step available")
        }
        const result = await emailSequenceAgent.process({
          action: "runStep",
          params: {
            userId: input.userId,
            email: input.email,
            step: context.nextStep.step,
          },
        })
        return { ...context, stepResult: result }
      },
    },
    {
      name: "mark-step-complete",
      agent: emailSequenceAgent,
      run: async (context) => {
        if (!context.stepResult || !context.stepResult.messageId) {
          throw new Error("Step result missing messageId")
        }
        const result = await emailSequenceAgent.process({
          action: "markComplete",
          params: {
            userId: input.userId,
            email: input.email,
            step: context.nextStep.step,
            messageId: context.stepResult.messageId,
          },
        })
        return { ...context, stepCompleted: result }
      },
    },
    {
      name: "schedule-email",
      agent: emailQueueManager,
      run: async (context) => {
        if (!context.stepResult || !context.stepResult.email) {
          throw new Error("Step result missing email content")
        }
        const result = await emailQueueManager.process({
          action: "schedule",
          params: {
            userId: input.userId,
            email: input.email,
            subject: context.stepResult.subject || "Your blueprint is ready",
            html: context.stepResult.email,
            scheduledFor: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24 hours from now
          },
        })
        return { ...context, scheduledEmail: result }
      },
    },
  ]

  return new PipelineOrchestrator(steps)
}

