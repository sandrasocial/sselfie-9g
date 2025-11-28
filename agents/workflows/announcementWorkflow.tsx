/**
 * Announcement Workflow
 *
 * Purpose: Broadcasts important platform updates and feature launches
 * - New feature announcements
 * - Product updates
 * - Time-sensitive communications
 * - Targeted to specific user segments (beta users, power users, etc.)
 *
 * Triggered by: Manual AdminSupervisorAgent request or platform events
 * Used by: MarketingAutomationAgent
 */

import { sendEmailNow, scheduleEmail, logEmailEvent } from "../marketing/marketingAutomationAgent"
import { audienceTools } from "../tools/audienceTools"
import { contentTools } from "../tools/contentTools"

export interface WorkflowInput {
  title: string
  description: string
  targetSegment?: string
  generateImage?: boolean
  scheduleDate?: string // ISO date string
  context?: any
}

export interface WorkflowOutput {
  status: "success" | "error"
  sentCount?: number
  scheduledCount?: number
  targetAudience?: string
  errors?: string[]
  debug?: any
}

/**
 * Runs the announcement workflow
 * Generates announcement email content and broadcasts to target audience
 */
export async function runWorkflow(input: WorkflowInput): Promise<WorkflowOutput> {
  console.log("[AnnouncementWorkflow] Starting announcement workflow", input)

  try {
    // Step 1: Determine audience
    let audienceData
    const targetSegment = input.targetSegment || "all_active_users"

    console.log(`[AnnouncementWorkflow] Fetching audience: ${targetSegment}`)

    switch (targetSegment) {
      case "beta_users":
        audienceData = await audienceTools.getBetaUsers.execute({})
        break
      case "paying_users":
        audienceData = await audienceTools.getPayingUsers.execute({})
        break
      case "heavy_users":
        audienceData = await audienceTools.getHeavyUsersSegment.execute({})
        break
      case "inactive_users":
        audienceData = await audienceTools.getInactiveUsersSegment.execute({})
        break
      case "trial_users":
        audienceData = await audienceTools.getTrialUsers.execute({})
        break
      case "new_users":
        audienceData = await audienceTools.getNewUsersSegment.execute({})
        break
      case "all_active_users":
      default:
        audienceData = await audienceTools.getAllActiveUsers.execute({})
        break
    }

    if (!audienceData.success || !audienceData.users || audienceData.users.length === 0) {
      console.error("[AnnouncementWorkflow] Failed to fetch audience or no users found")
      return {
        status: "error",
        errors: ["Failed to fetch audience or no users found"],
        targetAudience: targetSegment,
      }
    }

    const users = audienceData.users
    console.log(`[AnnouncementWorkflow] Found ${users.length} users in segment: ${targetSegment}`)

    // Step 2: Generate announcement content using AI
    console.log("[AnnouncementWorkflow] Generating announcement content...")

    const headlineResult = await contentTools.generateEmailCopy.execute({
      goal: `Create a compelling headline for: ${input.title}`,
      audienceSegment: targetSegment,
    })

    if (!headlineResult.success) {
      throw new Error(`Failed to generate headline: ${headlineResult.error}`)
    }

    const bodyResult = await contentTools.generateEmailCopy.execute({
      goal: `Write announcement body for: ${input.title}. Description: ${input.description}`,
      audienceSegment: targetSegment,
    })

    if (!bodyResult.success) {
      throw new Error(`Failed to generate body: ${bodyResult.error}`)
    }

    const whatsNewResult = await contentTools.generateEmailCopy.execute({
      goal: `Create a "What's New" section highlighting: ${input.description}`,
      audienceSegment: targetSegment,
    })

    if (!whatsNewResult.success) {
      throw new Error(`Failed to generate What's New section: ${whatsNewResult.error}`)
    }

    // Generate subject line
    const subjectResult = await contentTools.generateEmailCopy.execute({
      goal: `Create a short, engaging subject line for: ${input.title}`,
      audienceSegment: targetSegment,
    })

    if (!subjectResult.success) {
      throw new Error(`Failed to generate subject line: ${subjectResult.error}`)
    }

    const subject = subjectResult.emailCopy?.substring(0, 100) || `New Update: ${input.title}`

    // Step 3: Combine sections into final email HTML
    const headline = headlineResult.emailCopy || input.title
    const body = bodyResult.emailCopy || input.description
    const whatsNew = whatsNewResult.emailCopy || ""

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${input.title}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            h1 { color: #1a1a1a; font-size: 28px; margin-bottom: 20px; }
            h2 { color: #2a2a2a; font-size: 22px; margin-top: 30px; margin-bottom: 15px; }
            p { margin-bottom: 15px; }
            .highlight { background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <h1>${headline}</h1>
          <p>${body}</p>
          
          ${whatsNew ? `<div class="highlight"><h2>What's New</h2><p>${whatsNew}</p></div>` : ""}
          
          ${input.generateImage ? `<div style="margin: 30px 0; text-align: center;"><p><em>[Promo image generation not yet implemented]</em></p></div>` : ""}
          
          <div class="footer">
            <p>Best,<br>Sandra & the SSELFIE Team</p>
            <p style="font-size: 12px; color: #999;">You're receiving this because you're a valued SSELFIE user.</p>
          </div>
        </body>
      </html>
    `

    console.log("[AnnouncementWorkflow] Email content generated successfully")

    // Step 4: Send or schedule emails
    const isScheduled = !!input.scheduleDate
    let sentCount = 0
    let scheduledCount = 0
    const errors: string[] = []

    if (isScheduled) {
      // Schedule for future
      const scheduleDate = new Date(input.scheduleDate!)
      console.log(`[AnnouncementWorkflow] Scheduling announcement for ${scheduleDate.toISOString()}`)

      // Batch schedule in chunks of 100
      const batchSize = 100
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize)

        for (const user of batch) {
          try {
            const result = await scheduleEmail(user.id, user.email, subject, emailHtml, scheduleDate)

            if (result.success) {
              scheduledCount++
              await logEmailEvent({
                userId: user.id,
                emailType: "announcement",
                action: "scheduled",
                details: {
                  title: input.title,
                  targetSegment,
                  scheduledFor: scheduleDate.toISOString(),
                },
              })
            } else {
              errors.push(`Failed to schedule for ${user.email}: ${result.error}`)
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Unknown error"
            errors.push(`Error scheduling for ${user.email}: ${errorMsg}`)
          }
        }

        // Rate limiting between batches
        if (i + batchSize < users.length) {
          console.log(`[AnnouncementWorkflow] Scheduled batch ${i / batchSize + 1}, waiting 1s...`)
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }

      console.log(`[AnnouncementWorkflow] Scheduled ${scheduledCount} announcements`)
    } else {
      // Send immediately
      console.log("[AnnouncementWorkflow] Sending announcements immediately...")

      // Batch send in chunks of 100
      const batchSize = 100
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize)

        for (const user of batch) {
          try {
            const result = await sendEmailNow(user.email, subject, emailHtml)

            if (result.success) {
              sentCount++
              await logEmailEvent({
                userId: user.id,
                emailType: "announcement",
                action: "sent",
                details: {
                  title: input.title,
                  targetSegment,
                },
              })
            } else {
              errors.push(`Failed to send to ${user.email}: ${result.error}`)
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Unknown error"
            errors.push(`Error sending to ${user.email}: ${errorMsg}`)
          }

          // Rate limiting: 200ms between sends
          await new Promise((resolve) => setTimeout(resolve, 200))
        }

        // Additional delay between batches
        if (i + batchSize < users.length) {
          console.log(`[AnnouncementWorkflow] Sent batch ${i / batchSize + 1}, waiting 1s...`)
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }

      console.log(`[AnnouncementWorkflow] Sent ${sentCount} announcements`)
    }

    return {
      status: "success",
      sentCount,
      scheduledCount,
      targetAudience: targetSegment,
      errors: errors.length > 0 ? errors : undefined,
      debug: {
        totalUsers: users.length,
        subject,
        isScheduled,
      },
    }
  } catch (error) {
    console.error("[AnnouncementWorkflow] Error:", error)
    return {
      status: "error",
      errors: [error instanceof Error ? error.message : "Unknown error"],
      debug: { input },
    }
  }
}
