/**
 * Email Sequence Database Helpers
 * Manages 8-email welcome + nurture sequence tracking
 */

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface EmailSequenceStatus {
  userId: string | null
  email: string
  currentStep: number | null
  lastEmailSentAt: Date | null
  nextEmailDueAt: Date | null
  completed: boolean
}

/**
 * Get the next email step (1-8) that should be sent to a user
 * Returns null if sequence is complete or user is not eligible
 */
export async function getNextEmailToSend(
  userId: string | null,
  email: string,
): Promise<number | null> {
  try {
    // Check if user has received any emails in the sequence
    const logs = await sql`
      SELECT email_type, timestamp
      FROM email_logs
      WHERE user_email = ${email}
        AND email_type LIKE 'sequence-%'
        AND status = 'sent'
      ORDER BY timestamp DESC
    `

    // Extract step numbers from email_type (format: "sequence-1", "sequence-2", etc.)
    const receivedSteps = logs
      .map((log) => {
        const match = log.email_type?.match(/sequence-(\d+)/)
        return match ? parseInt(match[1], 10) : null
      })
      .filter((step): step is number => step !== null && step >= 1 && step <= 8)

    // If no emails sent, start with step 1
    if (receivedSteps.length === 0) {
      return 1
    }

    // Find the highest step received
    const highestStep = Math.max(...receivedSteps)

    // If all 8 steps completed, return null
    if (highestStep >= 8) {
      return null
    }

    // Check if enough time has passed since last email (24 hours minimum)
    const lastEmail = logs[0]
    if (lastEmail?.timestamp) {
      const lastSentAt = new Date(lastEmail.timestamp)
      const now = new Date()
      const hoursSinceLastEmail = (now.getTime() - lastSentAt.getTime()) / (1000 * 60 * 60)

      // If less than 24 hours, not eligible yet
      if (hoursSinceLastEmail < 24) {
        return null
      }
    }

    // Next step is highestStep + 1
    return highestStep + 1
  } catch (error) {
    console.error("[EmailSequence] Error getting next email step:", error)
    return null
  }
}

/**
 * Log that an email was sent in the sequence
 */
export async function logEmailSend(
  userId: string | null,
  email: string,
  emailStep: number,
  messageId?: string,
  error?: string,
): Promise<boolean> {
  try {
    await sql`
      INSERT INTO email_logs (
        user_email,
        user_id,
        email_type,
        status,
        resend_message_id,
        error_message,
        timestamp
      )
      VALUES (
        ${email},
        ${userId || null},
        ${`sequence-${emailStep}`},
        ${error ? "failed" : "sent"},
        ${messageId || null},
        ${error || null},
        NOW()
      )
    `

    return true
  } catch (error) {
    console.error("[EmailSequence] Error logging email send:", error)
    return false
  }
}

/**
 * Check if user has received a specific step email
 */
export async function hasReceivedEmail(
  userId: string | null,
  email: string,
  step: number,
): Promise<boolean> {
  try {
    const result = await sql`
      SELECT id
      FROM email_logs
      WHERE user_email = ${email}
        AND email_type = ${`sequence-${step}`}
        AND status = 'sent'
      LIMIT 1
    `

    return result.length > 0
  } catch (error) {
    console.error("[EmailSequence] Error checking received email:", error)
    return false
  }
}

/**
 * Get time since last email was sent
 * Returns null if no emails sent, or Date object of last email
 */
export async function getTimeSinceLastEmail(
  userId: string | null,
  email: string,
): Promise<Date | null> {
  try {
    const result = await sql`
      SELECT timestamp
      FROM email_logs
      WHERE user_email = ${email}
        AND email_type LIKE 'sequence-%'
        AND status = 'sent'
      ORDER BY timestamp DESC
      LIMIT 1
    `

    if (result.length === 0) {
      return null
    }

    return new Date(result[0].timestamp)
  } catch (error) {
    console.error("[EmailSequence] Error getting last email time:", error)
    return null
  }
}

/**
 * Get complete sequence status for a user
 */
export async function getSequenceStatus(
  userId: string | null,
  email: string,
): Promise<EmailSequenceStatus> {
  try {
    const logs = await sql`
      SELECT email_type, timestamp, status
      FROM email_logs
      WHERE user_email = ${email}
        AND email_type LIKE 'sequence-%'
      ORDER BY timestamp DESC
    `

    const receivedSteps = logs
      .filter((log) => log.status === "sent")
      .map((log) => {
        const match = log.email_type?.match(/sequence-(\d+)/)
        return match ? parseInt(match[1], 10) : null
      })
      .filter((step): step is number => step !== null && step >= 1 && step <= 8)

    const currentStep = receivedSteps.length > 0 ? Math.max(...receivedSteps) : 0
    const completed = currentStep >= 8

    const lastEmailSentAt =
      logs.length > 0 && logs[0].timestamp ? new Date(logs[0].timestamp) : null

    // Calculate next email due time (24 hours after last email, or now if no emails)
    let nextEmailDueAt: Date | null = null
    if (lastEmailSentAt && !completed) {
      nextEmailDueAt = new Date(lastEmailSentAt.getTime() + 24 * 60 * 60 * 1000)
    } else if (!lastEmailSentAt) {
      nextEmailDueAt = new Date() // Can send immediately
    }

    return {
      userId,
      email,
      currentStep: completed ? 8 : currentStep,
      lastEmailSentAt,
      nextEmailDueAt,
      completed,
    }
  } catch (error) {
    console.error("[EmailSequence] Error getting sequence status:", error)
    return {
      userId,
      email,
      currentStep: null,
      lastEmailSentAt: null,
      nextEmailDueAt: null,
      completed: false,
    }
  }
}

/**
 * Get all users who are eligible for the next email in sequence
 */
export async function getEligibleUsers(): Promise<
  Array<{ userId: string | null; email: string; nextStep: number }>
> {
  try {
    // Get all users from marketing_subscribers or users table
    const subscribers = await sql`
      SELECT DISTINCT
        COALESCE(ms.user_id, u.id) as user_id,
        COALESCE(ms.email, u.email) as email
      FROM marketing_subscribers ms
      FULL OUTER JOIN users u ON ms.email = u.email
      WHERE COALESCE(ms.email, u.email) IS NOT NULL
    `

    const eligible: Array<{ userId: string | null; email: string; nextStep: number }> = []

    for (const sub of subscribers) {
      const nextStep = await getNextEmailToSend(sub.user_id, sub.email)
      if (nextStep !== null) {
        eligible.push({
          userId: sub.user_id,
          email: sub.email,
          nextStep,
        })
      }
    }

    return eligible
  } catch (error) {
    console.error("[EmailSequence] Error getting eligible users:", error)
    return []
  }
}

