/**
 * Blueprint Follow-Up Pipeline
 * 
 * Trigger: When user downloads free blueprint
 * Flow:
 * 1. Deliver lead magnet (already done by blueprint route)
 * 2. Run BlueprintFollowUp workflow
 * 3. Send warm-up email sequence (3 emails over 3 days)
 * 4. Tag user as "warm lead"
 */

import { PipelineOrchestrator } from "../orchestrator/pipeline"
import type { PipelineStep } from "../orchestrator/types"
import { AgentRegistry } from "../core/agent-registry"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface BlueprintFollowUpInput {
  subscriberId: number
  email: string
  name: string
}

export interface BlueprintFollowUpOutput {
  success: boolean
  emailsScheduled: number
  userTagged: boolean
  error?: string
}

/**
 * Create Blueprint Follow-Up Pipeline
 */
export function createBlueprintFollowUpPipeline() {
  // Use AgentRegistry to avoid circular dependencies
  const marketingAgent = AgentRegistry.get("MarketingAutomationAgent")
  const emailSequenceAgent = AgentRegistry.get("EmailSequenceAgent")
  const leadMagnetAgent = AgentRegistry.get("LeadMagnetAgent")

  if (!marketingAgent || !emailSequenceAgent || !leadMagnetAgent) {
    throw new Error("Required agents not found in registry")
  }

  const steps: PipelineStep[] = [
    {
      name: "startBlueprintFollowUp",
      agent: marketingAgent,
      input: (context: unknown) => {
        const input = context as BlueprintFollowUpInput
        return {
          action: "startBlueprintFollowUp",
          params: {
            subscriberId: input.subscriberId,
            email: input.email,
            name: input.name,
          },
        }
      },
    },
    {
      name: "scheduleWarmUpEmails",
      agent: emailSequenceAgent,
      input: (context: unknown) => {
        const input = context as BlueprintFollowUpInput
        return {
          action: "runStep",
          params: {
            userId: null,
            email: input.email,
            step: 1, // Start with step 1 of warm-up sequence
          },
        }
      },
    },
    {
      name: "tagWarmLead",
      agent: leadMagnetAgent,
      input: (context: unknown) => {
        const input = context as BlueprintFollowUpInput
        return {
          action: "tagUser",
          params: {
            email: input.email,
            tag: "warm_lead",
            source: "blueprint_download",
          },
        }
      },
    },
  ]

  return new PipelineOrchestrator(steps)
}

/**
 * Run Blueprint Follow-Up Pipeline
 */
export async function runBlueprintFollowUpPipeline(
  input: BlueprintFollowUpInput,
): Promise<BlueprintFollowUpOutput> {
  try {
    console.log(`[BlueprintFollowUpPipeline] Starting for ${input.email}`)

    const pipeline = createBlueprintFollowUpPipeline()
    const result = await pipeline.run(input)

    if (!result.ok) {
      console.error(`[BlueprintFollowUpPipeline] Failed at step: ${result.failedAt}`)
      return {
        success: false,
        emailsScheduled: 0,
        userTagged: false,
        error: `Pipeline failed at ${result.failedAt}`,
      }
    }

    // Count scheduled emails
    const emailsScheduled = result.steps.length

    // Verify user was tagged
    const tagCheck = await sql`
      SELECT tags FROM marketing_subscribers
      WHERE email = ${input.email}
      LIMIT 1
    `

    const userTagged = tagCheck.length > 0 && tagCheck[0].tags?.includes("warm_lead")

    console.log(`[BlueprintFollowUpPipeline] Complete for ${input.email}`)

    return {
      success: true,
      emailsScheduled,
      userTagged: !!userTagged,
    }
  } catch (error) {
    console.error("[BlueprintFollowUpPipeline] Error:", error)
    return {
      success: false,
      emailsScheduled: 0,
      userTagged: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

