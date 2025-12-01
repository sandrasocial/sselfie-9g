/**
 * Revenue Recovery Pipeline
 * 
 * Handles three recovery scenarios:
 * A. Winback - Users who uploaded images but didn't buy
 * B. Upgrade - Users who visited pricing but didn't convert
 * C. Abandoned Checkout - Stripe session created but no purchase
 */

import { PipelineOrchestrator } from "../orchestrator/pipeline"
import type { PipelineStep } from "../orchestrator/types"
import { WinbackAgent } from "../sales/winbackAgent"
import { UpgradeAgent } from "../sales/upgradeAgent"
import { ChurnPreventionAgent } from "../sales/churnPreventionAgent"
import { emailQueueManager } from "../marketing/emailQueueManager"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export type RecoveryType = "winback" | "upgrade" | "abandoned_checkout"

export interface RevenueRecoveryInput {
  type: RecoveryType
  userId: string
  email: string
  context?: {
    daysSinceLastActivity?: number
    lastActivity?: string
    visitedPricingAt?: string
    checkoutSessionId?: string
    productType?: string
  }
}

export interface RevenueRecoveryOutput {
  success: boolean
  emailScheduled: boolean
  messageGenerated: boolean
  error?: string
}

/**
 * Create Winback Pipeline
 */
function createWinbackPipeline() {
  const steps: PipelineStep[] = [
    {
      name: "generateWinbackMessage",
      agent: new WinbackAgent(),
      input: (context: unknown) => {
        const input = context as RevenueRecoveryInput
        return {
          action: "generateMessage",
          params: {
            userId: input.userId,
            daysSinceLastActivity: input.context?.daysSinceLastActivity || 7,
            lastActivity: input.context?.lastActivity || "image upload",
          },
        }
      },
    },
    {
      name: "scheduleWinbackEmail",
      agent: emailQueueManager,
      input: (context: unknown) => {
        const input = context as RevenueRecoveryInput
        const previousStep = (context as any).steps?.[0]?.data
        return {
          action: "schedule",
          params: {
            userId: input.userId,
            email: input.email,
            subject: previousStep?.subject || "We miss you at SSELFIE",
            html: previousStep?.body || "<p>Hi there, we miss you!</p>",
            scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
          },
        }
      },
    },
  ]

  return new PipelineOrchestrator(steps)
}

/**
 * Create Upgrade Pipeline
 */
function createUpgradePipeline() {
  const steps: PipelineStep[] = [
    {
      name: "detectUpgradeOpportunity",
      agent: new UpgradeAgent(),
      input: (context: unknown) => {
        const input = context as RevenueRecoveryInput
        return {
          action: "detectOpportunity",
          params: {
            userId: input.userId,
          },
        }
      },
    },
    {
      name: "generateUpgradeMessage",
      agent: new UpgradeAgent(),
      input: (context: unknown) => {
        const input = context as RevenueRecoveryInput
        const opportunity = (context as any).steps?.[0]?.data
        if (!opportunity?.shouldUpgrade) {
          return { skip: true }
        }
        return {
          action: "generateMessage",
          params: {
            userId: input.userId,
            reason: opportunity.reason || "High usage detected",
            currentPlan: "free",
            recommendedPlan: opportunity.recommendedPlan || "SSELFIE Studio",
          },
        }
      },
    },
    {
      name: "scheduleUpgradeEmail",
      agent: emailQueueManager,
      input: (context: unknown) => {
        const input = context as RevenueRecoveryInput
        const message = (context as any).steps?.[1]?.data
        if (!message) {
          return { skip: true }
        }
        return {
          action: "schedule",
          params: {
            userId: input.userId,
            email: input.email,
            subject: message.subject || "Ready to scale your content?",
            html: message.body || "<p>You've been creating amazing content...</p>",
            scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
          },
        }
      },
    },
  ]

  return new PipelineOrchestrator(steps)
}

/**
 * Create Abandoned Checkout Pipeline
 */
function createAbandonedCheckoutPipeline() {
  const steps: PipelineStep[] = [
    {
      name: "generateChurnPreventionMessage",
      agent: new ChurnPreventionAgent(),
      input: (context: unknown) => {
        const input = context as RevenueRecoveryInput
        return {
          action: "generateMessage",
          params: {
            userId: input.userId,
            eventType: "abandoned_checkout",
            productType: input.context?.productType || "unknown",
            checkoutSessionId: input.context?.checkoutSessionId,
          },
        }
      },
    },
    {
      name: "scheduleRecoveryEmail",
      agent: emailQueueManager,
      input: (context: unknown) => {
        const input = context as RevenueRecoveryInput
        const message = (context as any).steps?.[0]?.data
        return {
          action: "schedule",
          params: {
            userId: input.userId,
            email: input.email,
            subject: message?.subject || "Complete your purchase",
            html: message?.body || "<p>You started a purchase but didn't complete it...</p>",
            scheduledFor: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour from now
          },
        }
      },
    },
  ]

  return new PipelineOrchestrator(steps)
}

/**
 * Run Revenue Recovery Pipeline
 */
export async function runRevenueRecoveryPipeline(
  input: RevenueRecoveryInput,
): Promise<RevenueRecoveryOutput> {
  try {
    console.log(`[RevenueRecoveryPipeline] Starting ${input.type} for ${input.email}`)

    let pipeline: PipelineOrchestrator

    switch (input.type) {
      case "winback":
        pipeline = createWinbackPipeline()
        break
      case "upgrade":
        pipeline = createUpgradePipeline()
        break
      case "abandoned_checkout":
        pipeline = createAbandonedCheckoutPipeline()
        break
      default:
        return {
          success: false,
          emailScheduled: false,
          messageGenerated: false,
          error: `Unknown recovery type: ${input.type}`,
        }
    }

    const result = await pipeline.run(input)

    if (!result.ok) {
      console.error(`[RevenueRecoveryPipeline] Failed at step: ${result.failedAt}`)
      return {
        success: false,
        emailScheduled: false,
        messageGenerated: false,
        error: `Pipeline failed at ${result.failedAt}`,
      }
    }

    // Check if email was scheduled
    const emailScheduled = result.steps.some((step) => step.data?.success === true)
    const messageGenerated = result.steps.some((step) => step.data?.subject || step.data?.body)

    console.log(`[RevenueRecoveryPipeline] Complete for ${input.email}`)

    return {
      success: true,
      emailScheduled,
      messageGenerated,
    }
  } catch (error) {
    console.error("[RevenueRecoveryPipeline] Error:", error)
    return {
      success: false,
      emailScheduled: false,
      messageGenerated: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

