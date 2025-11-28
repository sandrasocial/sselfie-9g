/**
 * Retention Workflow
 *
 * Purpose: Re-engages inactive or at-risk users
 * - Identifies users who haven't logged in recently
 * - Sends re-engagement emails with personalized content
 * - Tracks responses and engagement
 * - Escalates to win-back campaigns if needed
 *
 * Triggered by: AdminSupervisorAgent based on analytics
 * Used by: MarketingAutomationAgent
 */

import { contentTools } from "../tools/contentTools"
import { audienceTools } from "../tools/audienceTools"
import { sendEmailNow, scheduleEmail, logEmailEvent } from "../marketing/marketingAutomationAgent"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface WorkflowInput {
  userId: string
  inactiveDays?: number
  context?: any
}

export interface WorkflowOutput {
  status: "success" | "error" | "not_implemented"
  debug?: any
  emailsSent?: number
  emailsScheduled?: number
  error?: string
}

/**
 * Run the retention workflow for a single user or batch of users
 * Identifies inactive users, generates 3 AI retention emails, and schedules them
 */
export async function runWorkflow(input: WorkflowInput): Promise<WorkflowOutput> {
  console.log("[RetentionWorkflow] Starting retention workflow for userId:", input.userId)

  try {
    const userResult = await sql`
      SELECT id, email, display_name, first_name, last_name, created_at
      FROM users
      WHERE id = ${input.userId}
      LIMIT 1
    `

    if (userResult.length === 0) {
      return {
        status: "error",
        error: "User not found",
      }
    }

    const user = userResult[0]
    const firstName = user.first_name || user.display_name || "there"

    console.log(`[RetentionWorkflow] Processing user: ${user.email}`)

    console.log("[RetentionWorkflow] Generating retention email #1...")
    const email1Result = await contentTools.generateEmailCopy.execute({
      goal: "Re-engage inactive user who hasn't used SSELFIE in 7+ days",
      offer: "Remind them of the value they're missing and inspire them to come back",
      audienceSegment: "inactive_users",
    })

    if (!email1Result.success) {
      throw new Error(`Failed to generate email #1: ${email1Result.error}`)
    }

    console.log("[RetentionWorkflow] Generating retention email #2...")
    const email2Result = await contentTools.generateEmailCopy.execute({
      goal: "Second touchpoint: share a success story or new feature",
      offer: "Show them what others are achieving with SSELFIE",
      audienceSegment: "inactive_users",
    })

    if (!email2Result.success) {
      throw new Error(`Failed to generate email #2: ${email2Result.error}`)
    }

    console.log("[RetentionWorkflow] Generating retention email #3...")
    const email3Result = await contentTools.generateEmailCopy.execute({
      goal: "Final touchpoint: direct ask to return with emotional hook",
      offer: "We miss you, here's what you can do today",
      audienceSegment: "inactive_users",
    })

    if (!email3Result.success) {
      throw new Error(`Failed to generate email #3: ${email3Result.error}`)
    }

    console.log("[RetentionWorkflow] Sending email #1 immediately...")
    const sendResult1 = await sendEmailNow(
      user.email,
      "We miss you at SSELFIE ✨",
      `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Hey ${firstName},</h2>
        ${email1Result.emailCopy}
        <p>— Sandra</p>
      </div>
    `,
    )

    if (!sendResult1.success) {
      throw new Error(`Failed to send email #1: ${sendResult1.error}`)
    }

    await logEmailEvent({
      userId: user.id,
      emailType: "retention_email_1",
      action: "sent",
      details: { email: user.email },
    })

    console.log(`[RetentionWorkflow] Email #1 sent successfully to ${user.email}`)

    const email2Date = new Date()
    email2Date.setDate(email2Date.getDate() + 2)

    console.log(`[RetentionWorkflow] Scheduling email #2 for ${email2Date.toISOString()}...`)
    const scheduleResult2 = await scheduleEmail(
      user.id,
      user.email,
      "What you're missing at SSELFIE",
      `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Hi ${firstName},</h2>
        ${email2Result.emailCopy}
        <p>— Sandra</p>
      </div>
    `,
      email2Date,
    )

    if (!scheduleResult2.success) {
      throw new Error(`Failed to schedule email #2: ${scheduleResult2.error}`)
    }

    const email3Date = new Date()
    email3Date.setDate(email3Date.getDate() + 5)

    console.log(`[RetentionWorkflow] Scheduling email #3 for ${email3Date.toISOString()}...`)
    const scheduleResult3 = await scheduleEmail(
      user.id,
      user.email,
      "One last thing before you go...",
      `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${firstName},</h2>
        ${email3Result.emailCopy}
        <p>— Sandra</p>
      </div>
    `,
      email3Date,
    )

    if (!scheduleResult3.success) {
      throw new Error(`Failed to schedule email #3: ${scheduleResult3.error}`)
    }

    console.log("[RetentionWorkflow] Updating user segment to 'reactivation_sequence'...")
    await sql`
      UPDATE users
      SET metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{marketing_segment}',
        '"reactivation_sequence"'
      )
      WHERE id = ${user.id}
    `

    console.log("[RetentionWorkflow] Retention workflow completed successfully!")

    return {
      status: "success",
      emailsSent: 1,
      emailsScheduled: 2,
      debug: {
        userId: user.id,
        email: user.email,
        email1Sent: true,
        email2Scheduled: email2Date.toISOString(),
        email3Scheduled: email3Date.toISOString(),
        segmentUpdated: true,
      },
    }
  } catch (error) {
    console.error("[RetentionWorkflow] Error running retention workflow:", error)
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
      debug: { input },
    }
  }
}

/**
 * Batch retention workflow - runs retention for multiple inactive users
 */
export async function runBatchRetentionWorkflow(inactiveDays = 7): Promise<WorkflowOutput> {
  console.log(`[RetentionWorkflow] Starting batch retention for users inactive ${inactiveDays}+ days...`)

  try {
    const inactiveResult = await audienceTools.getInactiveUsersSegment.execute({
      minInactiveDays: inactiveDays,
    })

    if (!inactiveResult.success) {
      throw new Error(`Failed to get inactive users: ${inactiveResult.error}`)
    }

    const inactiveUsers = inactiveResult.users || []
    console.log(`[RetentionWorkflow] Found ${inactiveUsers.length} inactive users`)

    if (inactiveUsers.length === 0) {
      return {
        status: "success",
        emailsSent: 0,
        emailsScheduled: 0,
        debug: { message: "No inactive users found" },
      }
    }

    let totalSent = 0
    let totalScheduled = 0
    const errors: string[] = []

    for (const user of inactiveUsers) {
      try {
        const result = await runWorkflow({
          userId: user.id,
          inactiveDays,
        })

        if (result.status === "success") {
          totalSent += result.emailsSent || 0
          totalScheduled += result.emailsScheduled || 0
        } else {
          errors.push(`${user.email}: ${result.error}`)
        }

        // Rate limiting: wait 500ms between users
        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch (error) {
        errors.push(`${user.email}: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }

    console.log(
      `[RetentionWorkflow] Batch complete: ${totalSent} sent, ${totalScheduled} scheduled, ${errors.length} errors`,
    )

    return {
      status: errors.length === 0 ? "success" : "error",
      emailsSent: totalSent,
      emailsScheduled: totalScheduled,
      debug: {
        usersProcessed: inactiveUsers.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    }
  } catch (error) {
    console.error("[RetentionWorkflow] Error in batch retention workflow:", error)
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
