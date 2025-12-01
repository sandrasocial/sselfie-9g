import { neon } from "@neondatabase/serverless"
import { sendEmail } from "@/lib/email/resend"

/**
 * Execute offer pathway for a subscriber
 * Calls adminSupervisorAgent.computeOfferPathway()
 * Based on recommendation, enqueues appropriate email
 * NEVER sends immediately - always queues for approval
 */
export async function executeOfferPathway(subscriberId: number): Promise<{
  success: boolean
  recommendation: string | null
  queued: boolean
  error?: string
}> {
  const sql = neon(process.env.DATABASE_URL!)

  try {
    console.log(`[MarketingAutomationAgent] Executing offer pathway for subscriber ${subscriberId}`)

    // Call admin supervisor agent to compute offer pathway
    const { computeOfferPathway } = await import("../admin/adminSupervisorAgent")
    const pathwayResult = await computeOfferPathway(subscriberId)

    if (!pathwayResult.success || !pathwayResult.recommendation) {
      console.log(
        `[MarketingAutomationAgent] No offer recommendation for subscriber ${subscriberId}: ${pathwayResult.rationale}`,
      )
      return {
        success: true,
        recommendation: null,
        queued: false,
      }
    }

    // Based on recommendation, queue appropriate workflow
    let workflowType: string

    switch (pathwayResult.recommendation) {
      case "membership":
        workflowType = "offer_membership"
        break
      case "credits":
        workflowType = "offer_credits"
        break
      case "studio":
        workflowType = "offer_studio"
        break
      case "trial":
        workflowType = "offer_trial"
        break
      default:
        console.log(
          `[MarketingAutomationAgent] Unknown recommendation: ${pathwayResult.recommendation} for subscriber ${subscriberId}`,
        )
        return {
          success: true,
          recommendation: pathwayResult.recommendation,
          queued: false,
        }
    }

    // Queue workflow for approval
    await sql`
      INSERT INTO workflow_queue (subscriber_id, workflow_type, status, payload)
      VALUES (
        ${subscriberId},
        ${workflowType},
        'pending',
        ${JSON.stringify({
          recommendation: pathwayResult.recommendation,
          confidence: pathwayResult.confidence,
          rationale: pathwayResult.rationale,
        })}
      )
    `

    console.log(`[MarketingAutomationAgent] Queued ${workflowType} for subscriber ${subscriberId} (pending approval)`)

    return {
      success: true,
      recommendation: pathwayResult.recommendation,
      queued: true,
    }
  } catch (error) {
    console.error(`[MarketingAutomationAgent] Error executing offer pathway for subscriber ${subscriberId}:`, error)
    return {
      success: false,
      recommendation: null,
      queued: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Executes action for a subscriber based on recommended action
 * Sends appropriate email based on action type
 * @param subscriberId - The subscriber ID
 * @param action - The recommended action
 * @returns Execution result
 */
export async function executeActionForSubscriber(
  subscriberId: number,
  action: "nudge_email" | "new_offer" | "content_touchpoint" | "pause",
): Promise<{
  success: boolean
  action: string
  sent: boolean
  error?: string
}> {
  const sql = neon(process.env.DATABASE_URL!)

  try {
    console.log(`[MarketingAutomationAgent] Executing action '${action}' for subscriber ${subscriberId}`)

    // Fetch subscriber
    const [subscriber] = await sql`
      SELECT id, email, name
      FROM blueprint_subscribers
      WHERE id = ${subscriberId}
    `

    if (!subscriber) {
      return {
        success: false,
        action,
        sent: false,
        error: "Subscriber not found",
      }
    }

    // Handle each action type
    switch (action) {
      case "nudge_email":
        await sendNudgeEmail(subscriber)
        break
      case "content_touchpoint":
        await sendContentTouchpoint(subscriber)
        break
      case "new_offer":
        // Call executeOfferPathway from offer engine (avoid circular import)
        const offerPathway = await import("@/lib/offerPathwayEngine")
        if (offerPathway.executeOfferPathway) {
          await offerPathway.executeOfferPathway(subscriberId)
        }
        break
      case "pause":
        // Do nothing
        console.log(`[MarketingAutomationAgent] Pausing action for subscriber ${subscriberId}`)
        return {
          success: true,
          action,
          sent: false,
        }
    }

    console.log(`[MarketingAutomationAgent] Action '${action}' executed for subscriber ${subscriberId}`)

    return {
      success: true,
      action,
      sent: true,
    }
  } catch (error) {
    console.error(`[MarketingAutomationAgent] Error executing action for subscriber ${subscriberId}:`, error)
    return {
      success: false,
      action,
      sent: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Sends gentle re-engagement email
 * Uses Times New Roman, Sandra's warm editorial voice
 */
async function sendNudgeEmail(subscriber: any) {
  const subject = "Your brand blueprint is waiting"
  const html = `
    <div style="font-family: 'Times New Roman', serif; color: #292524; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="font-size: 28px; font-weight: 400; margin-bottom: 24px; line-height: 1.3;">
        ${subscriber.name ? `Hi ${subscriber.name}` : "Hi there"},
      </h1>
      
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
        I noticed you downloaded your Brand Blueprint. That's exciting!
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
        I'm curious—did you have a chance to review the concept directions I created for you?
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
        If you have any questions about how to bring these concepts to life with SSELFIE Studio, I'd love to help you take the next step.
      </p>
      
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/checkout/membership" style="display: inline-block; background: #292524; color: #fafaf9; padding: 14px 32px; text-decoration: none; font-size: 16px; border-radius: 2px;">
        Explore SSELFIE Studio
      </a>
      
      <p style="font-size: 14px; line-height: 1.6; margin-top: 32px; color: #57534e;">
        Sandra
      </p>
    </div>
  `

  await sendEmail({
    to: subscriber.email,
    subject,
    html,
  })
}

/**
 * Sends valuable content drop email
 * Uses Times New Roman, Sandra's warm editorial voice
 */
async function sendContentTouchpoint(subscriber: any) {
  const subject = "How to choose the right concept for your brand"
  const html = `
    <div style="font-family: 'Times New Roman', serif; color: #292524; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="font-size: 28px; font-weight: 400; margin-bottom: 24px; line-height: 1.3;">
        ${subscriber.name ? `Hi ${subscriber.name}` : "Hi there"},
      </h1>
      
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
        I wanted to share something that might help you decide which concept direction to pursue first.
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
        When I work with clients, I always recommend starting with the concept that feels most <em>authentic</em> to who you are right now—not who you think you should be.
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
        Your brand should feel like coming home, not putting on a costume.
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
        If you're ready to bring your concept to life with AI-powered photoshoots, I'd love to show you what SSELFIE Studio can do.
      </p>
      
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/checkout/membership" style="display: inline-block; background: #292524; color: #fafaf9; padding: 14px 32px; text-decoration: none; font-size: 16px; border-radius: 2px;">
        See SSELFIE Studio
      </a>
      
      <p style="font-size: 14px; line-height: 1.6; margin-top: 32px; color: #57534e;">
        Sandra
      </p>
    </div>
  `

  await sendEmail({
    to: subscriber.email,
    subject,
    html,
  })
}

// Re-export core functions from the TS module to satisfy imports that resolve to this file
export {
  sendEmailNow,
  scheduleEmail,
  logEmailEvent,
  getUserSegment,
  checkEmailQueue,
  sendUserJourneyEmail,
} from "./marketingAutomationAgent"

// Re-export the agent class and factory function for AgentRegistry
// This is safe because AgentRegistry uses lazy loading
export {
  MarketingAutomationAgent,
  getMarketingAutomationAgent,
  marketingAutomationAgent,
} from "./marketingAutomationAgent"

// Provide minimal stubs for legacy imports not implemented here
export async function generateAnalyticsInsights() {
  return { status: "not_implemented" }
}
export async function generateUpsellSequence() {
  return { status: "not_implemented" }
}
export async function runUpsellSequence() {
  return { status: "not_implemented" }
}
export async function sendStudioOffer() {
  return { status: "not_implemented" }
}
export async function sendStarterOffer() {
  return { status: "not_implemented" }
}
export async function sendTrialInvite() {
  return { status: "not_implemented" }
}
