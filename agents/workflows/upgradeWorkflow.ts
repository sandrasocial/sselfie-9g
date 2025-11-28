import { upgradeAgent } from "../sales/upgradeAgent"
import { sendEmailNow } from "../marketing/marketingAutomationAgent"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface WorkflowInput {
  userId?: string
  batchSize?: number
}

export interface WorkflowOutput {
  success: boolean
  usersProcessed: number
  opportunitiesDetected: number
  emailsSent: number
  errors: string[]
}

/**
 * Upgrade Workflow
 *
 * Detects upgrade opportunities and sends personalized upgrade recommendations
 */
export async function runWorkflow(input: WorkflowInput): Promise<WorkflowOutput> {
  console.log("[UpgradeWorkflow] Starting workflow")

  const results = {
    success: true,
    usersProcessed: 0,
    opportunitiesDetected: 0,
    emailsSent: 0,
    errors: [] as string[],
  }

  try {
    let usersToCheck

    if (input.userId) {
      // Single user check
      usersToCheck = await sql`
        SELECT id, email, display_name, plan
        FROM users
        WHERE id = ${input.userId}
        LIMIT 1
      `
    } else {
      // Batch processing: check active users who are not already on highest plan
      const batchSize = input.batchSize || 100
      usersToCheck = await sql`
        SELECT id, email, display_name, plan
        FROM users
        WHERE last_login_at > NOW() - INTERVAL '7 days'
          AND (plan IS NULL OR plan != 'studio')
        ORDER BY last_login_at DESC
        LIMIT ${batchSize}
      `
    }

    console.log(`[UpgradeWorkflow] Checking ${usersToCheck.length} users for upgrade opportunities`)

    for (const user of usersToCheck) {
      try {
        // Detect upgrade opportunity
        const opportunity = await upgradeAgent.detectUpgradeOpportunity({
          userId: user.id,
        })

        results.usersProcessed++

        if (opportunity.shouldUpgrade) {
          results.opportunitiesDetected++

          // Generate personalized upgrade message
          const message = await upgradeAgent.generateUpgradeMessage({
            userId: user.id,
            reason: opportunity.reason || "High usage",
            currentPlan: user.plan || "free",
            recommendedPlan: opportunity.recommendedPlan || "SSELFIE Studio",
          })

          // Send upgrade email
          const emailResult = await sendEmailNow(user.email, message.subject, message.body)

          if (emailResult.success) {
            results.emailsSent++
          } else {
            results.errors.push(`${user.email}: ${emailResult.error}`)
          }

          // Rate limiting for upgrade emails
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      } catch (error) {
        results.errors.push(`${user.email}: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }

    console.log(
      `[UpgradeWorkflow] Completed: ${results.opportunitiesDetected} opportunities found, ${results.emailsSent} emails sent`,
    )
  } catch (error) {
    console.error("[UpgradeWorkflow] Error:", error)
    results.success = false
    results.errors.push(error instanceof Error ? error.message : "Unknown error")
  }

  return results
}
