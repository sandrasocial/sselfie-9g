/**
 * Universal Email Sequence Trigger Endpoint
 * Processes all eligible subscribers and sends next email in sequence
 * POST /api/email-sequence/trigger
 */

import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getNextEmailToSend, hasReceivedEmail, getSequenceStatus } from "@/lib/data/email-sequence"
import { sendSequenceEmail } from "@/lib/email/send-sequence-email"
import { getAllSubscribers } from "@/lib/data/sync-resend-users"

const sql = neon(process.env.DATABASE_URL!)

export interface TriggerResult {
  processed: number
  sent: number
  skipped: number
  errors: Array<{ email: string; error: string }>
}

/**
 * Get all users eligible for sequence emails
 * Includes Supabase users and Resend Audience subscribers
 */
async function getAllEligibleUsers(): Promise<
  Array<{ userId: string | null; email: string; nextStep: number }>
> {
  const eligible: Array<{ userId: string | null; email: string; nextStep: number }> = []

  try {
    // Get all Supabase users
    const users = await sql`
      SELECT id, email
      FROM users
      WHERE email IS NOT NULL
    `

    for (const user of users) {
      const nextStep = await getNextEmailToSend(user.id, user.email)
      if (nextStep !== null) {
        eligible.push({
          userId: user.id,
          email: user.email,
          nextStep,
        })
      }
    }

    // Get all marketing subscribers (from Resend Audience)
    const subscribers = await getAllSubscribers()

    for (const sub of subscribers) {
      // Skip if already processed as a user
      if (eligible.some((e) => e.email === sub.email)) {
        continue
      }

      const nextStep = await getNextEmailToSend(sub.userId, sub.email)
      if (nextStep !== null) {
        eligible.push({
          userId: sub.userId,
          email: sub.email,
          nextStep,
        })
      }
    }

    return eligible
  } catch (error) {
    console.error("[EmailSequenceTrigger] Error getting eligible users:", error)
    return []
  }
}

export async function POST(request: Request) {
  const startTime = Date.now()

  try {
    console.log("[EmailSequenceTrigger] Starting email sequence trigger...")

    const result: TriggerResult = {
      processed: 0,
      sent: 0,
      skipped: 0,
      errors: [],
    }

    // Get all eligible users
    const eligibleUsers = await getAllEligibleUsers()

    console.log(`[EmailSequenceTrigger] Found ${eligibleUsers.length} eligible users`)

    // Process each user
    for (const user of eligibleUsers) {
      result.processed++

      try {
        // Double-check eligibility (prevent race conditions)
        const nextStep = await getNextEmailToSend(user.userId, user.email)

        if (nextStep === null) {
          result.skipped++
          console.log(`[EmailSequenceTrigger] Skipping ${user.email}: not eligible`)
          continue
        }

        // Validate step is correct (prevent out-of-order sending)
        if (nextStep !== user.nextStep) {
          result.skipped++
          console.log(
            `[EmailSequenceTrigger] Skipping ${user.email}: step mismatch (expected ${nextStep}, got ${user.nextStep})`,
          )
          continue
        }

        // Check if already sent (idempotency check)
        const alreadySent = await hasReceivedEmail(user.userId, user.email, nextStep)
        if (alreadySent) {
          result.skipped++
          console.log(
            `[EmailSequenceTrigger] Skipping ${user.email}: step ${nextStep} already sent`,
          )
          continue
        }

        // Validate step is sequential (prevent skipping)
        if (nextStep > 1) {
          const previousStep = nextStep - 1
          const hasPrevious = await hasReceivedEmail(user.userId, user.email, previousStep)
          if (!hasPrevious) {
            result.skipped++
            console.log(
              `[EmailSequenceTrigger] Skipping ${user.email}: previous step ${previousStep} not sent`,
            )
            continue
          }
        }

        // Send the email
        console.log(`[EmailSequenceTrigger] Sending step ${nextStep} to ${user.email}`)
        const sendResult = await sendSequenceEmail({
          email: user.email,
          userId: user.userId,
          step: nextStep,
        })

        if (sendResult.success) {
          result.sent++
          console.log(
            `[EmailSequenceTrigger] ✓ Sent step ${nextStep} to ${user.email} (message ID: ${sendResult.messageId})`,
          )
        } else {
          result.errors.push({
            email: user.email,
            error: sendResult.error || "Unknown error",
          })
          console.error(
            `[EmailSequenceTrigger] ✗ Failed to send step ${nextStep} to ${user.email}: ${sendResult.error}`,
          )
        }

        // Rate limiting: small delay between sends
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error"
        result.errors.push({
          email: user.email,
          error: errorMsg,
        })
        console.error(`[EmailSequenceTrigger] Error processing ${user.email}:`, errorMsg)
      }
    }

    const duration = Date.now() - startTime

    console.log(
      `[EmailSequenceTrigger] Complete: ${result.sent} sent, ${result.skipped} skipped, ${result.errors.length} errors (${duration}ms)`,
    )

    return NextResponse.json({
      success: true,
      ...result,
      duration,
    })
  } catch (error) {
    console.error("[EmailSequenceTrigger] Fatal error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

