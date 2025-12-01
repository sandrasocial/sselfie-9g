import { PipelineOrchestrator } from "@/agents/orchestrator/pipeline"
import type { PipelineStep } from "@/agents/orchestrator/types"
import { AgentRegistry } from "@/agents/core/agent-registry"

/**
 * Lead Magnet Delivery Pipeline
 * Purpose: Automatically deliver freebie + track opens + track clicks
 * 
 * Steps:
 * 1. Deliver lead magnet
 * 2. Track open (simulated)
 * 3. Track click (simulated)
 * 
 * Input: { userId: string, magnetType?: string, userEmail?: string }
 */
export function createLeadMagnetPipeline(input: {
  userId: string
  magnetType?: string
  userEmail?: string
}) {
  const leadMagnetAgent = AgentRegistry.get("LeadMagnetAgent")

  if (!leadMagnetAgent) {
    throw new Error("LeadMagnetAgent not found in registry")
  }

  // Safety: Block Maya
  if (leadMagnetAgent.getMetadata().name.toLowerCase().includes("maya")) {
    throw new Error("Maya cannot be used in pipelines")
  }

  const steps: PipelineStep[] = [
    {
      name: "deliver-lead-magnet",
      agent: leadMagnetAgent,
      run: async (context) => {
        const result = await leadMagnetAgent.process({
          action: "deliver",
          params: {
            userId: input.userId,
            magnetType: input.magnetType || "blueprint",
            userEmail: input.userEmail || "",
          },
        })
        return { ...context, delivery: result }
      },
    },
    {
      name: "track-open",
      agent: leadMagnetAgent,
      run: async (context) => {
        if (!context.delivery || !context.delivery.success) {
          throw new Error("Lead magnet delivery failed")
        }
        const result = await leadMagnetAgent.process({
          action: "trackOpen",
          params: {
            userId: input.userId,
            magnetType: input.magnetType || "blueprint",
          },
        })
        return { ...context, openTracked: result }
      },
    },
    {
      name: "track-click",
      agent: leadMagnetAgent,
      run: async (context) => {
        const result = await leadMagnetAgent.process({
          action: "trackClick",
          params: {
            userId: input.userId,
            magnetType: input.magnetType || "blueprint",
          },
        })
        return { ...context, clickTracked: result }
      },
    },
  ]

  return new PipelineOrchestrator(steps)
}

