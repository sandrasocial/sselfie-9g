import { churnPreventionAgent } from "../sales/churnPreventionAgent"
import { sendEmailNow } from "../marketing/marketingAutomationAgent"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface WorkflowInput {
  userId: string
  eventType: "payment_failed" | "renewal_upcoming" | "cancellation" | "downgrade"
  metadata?: Record<string, any>
}

export interface WorkflowOutput {
  success: boolean
  eventLogged: boolean
  emailSent: boolean
  error?: string
}

/**
 * Churn Prevention Workflow
 *
 * Handles subscription lifecycle events and sends appropriate retention messages
 */
export async function runWorkflow(input: WorkflowInput): Promise<WorkflowOutput> {
  console.log(`[ChurnPreventionWorkflow] Starting workflow for ${input.eventType}`)

  try {
    // Log the subscription event
    const eventResult = await churnPreventionAgent.logSubscriptionEvent({
      userId: input.userId,
      eventType: input.eventType,
      metadata: input.metadata,
    })

    if (!eventResult.success) {
      return {
        success: false,
        eventLogged: false,
        emailSent: false,
        error: "Failed to log event",
      }
    }

    // Get user details
    const userData = await sql`
      SELECT email, display_name, plan
      FROM users
      WHERE id = ${input.userId}
      LIMIT 1
    `

    if (userData.length === 0) {
      return {
        success: false,
        eventLogged: true,
        emailSent: false,
        error: "User not found",
      }
    }

    const user = userData[0]

    // Generate retention message
    const message = await churnPreventionAgent.generateRetentionMessage({
      userId: input.userId,
      eventType: input.eventType,
      userPlan: user.plan || "free",
    })

    // Send retention email
    const emailResult = await sendEmailNow(user.email, message.subject, message.body)

    if (emailResult.success) {
      // Mark email as sent in subscription_events
      await sql`
        UPDATE subscription_events
        SET email_sent = TRUE, email_sent_at = NOW()
        WHERE id = ${eventResult.eventId}
      `
    }

    console.log("[ChurnPreventionWorkflow] Workflow completed successfully")
    return {
      success: true,
      eventLogged: true,
      emailSent: emailResult.success,
    }
  } catch (error) {
    console.error("[ChurnPreventionWorkflow] Error:", error)
    return {
      success: false,
      eventLogged: false,
      emailSent: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
