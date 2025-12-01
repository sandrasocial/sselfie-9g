import { PipelineOrchestrator } from "@/agents/orchestrator/pipeline"
import type { PipelineStep } from "@/agents/orchestrator/types"
import { AgentRegistry } from "@/agents/core/agent-registry"

/**
 * Churn Prevention Pipeline
 * Purpose: Detect potential churn → send personalized retention message
 * 
 * Steps:
 * 1. Log subscription event
 * 2. Generate retention message
 * 3. Schedule email
 * 
 * Input: { userId: string, eventType?: string }
 */
export function createChurnPipeline(input: { userId: string; eventType?: string }) {
  const churnAgent = AgentRegistry.get("ChurnPreventionAgent")
  const emailQueueManager = AgentRegistry.get("EmailQueueManager")

  if (!churnAgent) {
    throw new Error("ChurnPreventionAgent not found in registry")
  }
  if (!emailQueueManager) {
    throw new Error("EmailQueueManager not found in registry")
  }

  // Safety: Block Maya
  if (churnAgent.getMetadata().name.toLowerCase().includes("maya")) {
    throw new Error("Maya cannot be used in pipelines")
  }

  const steps: PipelineStep[] = [
    {
      name: "log-subscription-event",
      agent: churnAgent,
      run: async (context) => {
        const result = await churnAgent.process({
          action: "logEvent",
          params: {
            userId: input.userId,
            eventType: input.eventType || "renewal_upcoming",
            userPlan: "pro",
            metadata: {},
          },
        })
        return { ...context, eventLogged: result }
      },
    },
    {
      name: "generate-retention-message",
      agent: churnAgent,
      run: async (context) => {
        const result = await churnAgent.process({
          action: "generateMessage",
          params: {
            userId: input.userId,
            userPlan: "pro",
            eventType: input.eventType || "renewal_upcoming",
          },
        })
        return { ...context, retentionMessage: result }
      },
    },
    {
      name: "schedule-email",
      agent: emailQueueManager,
      run: async (context) => {
        if (!context.retentionMessage || !context.retentionMessage.body) {
          throw new Error("Retention message not generated")
        }
        const result = await emailQueueManager.process({
          action: "schedule",
          params: {
            userId: input.userId,
            email: "",
            subject: context.retentionMessage.subject || "Quick question about your account",
            html: context.retentionMessage.body,
            scheduledFor: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
          },
        })
        return { ...context, scheduledEmail: result }
      },
    },
  ]

  return new PipelineOrchestrator(steps)
}

