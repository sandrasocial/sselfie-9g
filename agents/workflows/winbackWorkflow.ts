import { winbackAgent } from "../sales/winbackAgent"
import { sendEmailNow } from "../marketing/marketingAutomationAgent"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface WorkflowInput {
  userId?: string
  daysSinceActivity?: number
  batchSize?: number
}

export interface WorkflowOutput {
  success: boolean
  usersProcessed: number
  emailsSent: number
  errors: string[]
}

/**
 * Winback Workflow
 *
 * Identifies inactive users and sends personalized reactivation messages
 */
export async function runWorkflow(input: WorkflowInput): Promise<WorkflowOutput> {
  console.log("[WinbackWorkflow] Starting workflow")

  const results = {
    success: true,
    usersProcessed: 0,
    emailsSent: 0,
    errors: [] as string[],
  }

  try {
    const daysSinceActivity = input.daysSinceActivity || 7
    const batchSize = input.batchSize || 50

    // Find inactive users
    let inactiveUsers

    if (input.userId) {
      // Single user processing
      inactiveUsers = await sql`
        SELECT 
          u.id,
          u.email,
          u.display_name,
          u.last_login_at,
          COALESCE(
            (SELECT MAX(created_at) FROM maya_chats WHERE user_id = u.id),
            (SELECT MAX(created_at) FROM generated_images WHERE user_id = u.id),
            u.last_login_at
          ) as last_activity
        FROM users u
        WHERE u.id = ${input.userId}
          AND u.last_login_at < NOW() - INTERVAL '${daysSinceActivity} days'
        LIMIT 1
      `
    } else {
      // Batch processing
      inactiveUsers = await sql`
        SELECT 
          u.id,
          u.email,
          u.display_name,
          u.last_login_at,
          COALESCE(
            (SELECT MAX(created_at) FROM maya_chats WHERE user_id = u.id),
            (SELECT MAX(created_at) FROM generated_images WHERE user_id = u.id),
            u.last_login_at
          ) as last_activity
        FROM users u
        WHERE u.last_login_at < NOW() - INTERVAL '${daysSinceActivity} days'
          AND u.last_login_at > NOW() - INTERVAL '14 days'
        ORDER BY u.last_login_at DESC
        LIMIT ${batchSize}
      `
    }

    console.log(`[WinbackWorkflow] Found ${inactiveUsers.length} inactive users`)

    for (const user of inactiveUsers) {
      try {
        // Calculate days since last activity
        const lastActivity = new Date(user.last_activity || user.last_login_at)
        const daysSince = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))

        // Generate personalized winback message
        const message = await winbackAgent.generateWinbackMessage({
          userId: user.id,
          daysSinceLastActivity: daysSince,
          lastActivity: "using SSELFIE features",
        })

        // Send winback email
        const emailResult = await sendEmailNow(user.email, message.subject, message.body)

        if (emailResult.success) {
          results.emailsSent++

          // Log to user_journey_messages
          await sql`
            INSERT INTO user_journey_messages (user_id, state, content_json, delivered_via)
            VALUES (
              ${user.id},
              'winback',
              ${JSON.stringify({
                subject: message.subject,
                body: message.body,
                daysSinceActivity: daysSince,
              })},
              'email'
            )
          `
        } else {
          results.errors.push(`${user.email}: ${emailResult.error}`)
        }

        results.usersProcessed++

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200))
      } catch (error) {
        results.errors.push(`${user.email}: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }

    console.log(`[WinbackWorkflow] Completed: ${results.usersProcessed} processed, ${results.emailsSent} emails sent`)
  } catch (error) {
    console.error("[WinbackWorkflow] Error:", error)
    results.success = false
    results.errors.push(error instanceof Error ? error.message : "Unknown error")
  }

  return results
}
