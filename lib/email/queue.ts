/**
 * Email Queue Helper
 * Schedules emails to be sent at specific times
 * Uses marketing_email_queue table, processed by cron job
 */

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface ScheduleEmailOptions {
  userId: string
  email: string
  subject: string
  html: string
  scheduledFor: Date
  emailType?: string
  metadata?: Record<string, any>
}

/**
 * Schedule an email to be sent at a specific time
 * Emails are processed by the cron job at /api/cron/process-email-queue
 */
export async function scheduleEmail(
  options: ScheduleEmailOptions,
): Promise<{ success: boolean; queueId?: string; error?: string }> {
  try {
    const result = await sql`
      INSERT INTO marketing_email_queue (
        user_id,
        email,
        subject,
        html,
        scheduled_for,
        status
      )
      VALUES (
        ${options.userId},
        ${options.email},
        ${options.subject},
        ${options.html},
        ${options.scheduledFor.toISOString()},
        'pending'
      )
      RETURNING id
    `

    if (!result || result.length === 0) {
      return {
        success: false,
        error: "Failed to queue email",
      }
    }

    const queueId = result[0].id
    console.log(
      `[EmailQueue] Email scheduled for ${options.email} at ${options.scheduledFor.toISOString()}`,
    )

    return {
      success: true,
      queueId,
    }
  } catch (error) {
    console.error("[EmailQueue] Error scheduling email:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Schedule multiple emails in a sequence
 * Useful for welcome sequences, nurture campaigns, etc.
 */
export async function scheduleEmailSequence(
  emails: ScheduleEmailOptions[],
): Promise<{ success: boolean; scheduled: number; errors: string[] }> {
  const errors: string[] = []
  let scheduled = 0

  for (const email of emails) {
    const result = await scheduleEmail(email)
    if (result.success) {
      scheduled++
    } else {
      errors.push(`${email.email}: ${result.error}`)
    }
  }

  return {
    success: errors.length === 0,
    scheduled,
    errors,
  }
}

/**
 * Cancel a scheduled email
 */
export async function cancelScheduledEmail(
  queueId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await sql`
      UPDATE marketing_email_queue
      SET status = 'cancelled'
      WHERE id = ${queueId}
        AND status = 'pending'
    `

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

