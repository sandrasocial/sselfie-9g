import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { addLoopsContactTags } from '@/lib/loops/manage-contact'

const sql = neon(process.env.DATABASE_URL!)

/**
 * Welcome Back Sequence - Loops Integration
 * 
 * This cron job triggers Loops sequences by adding tags to contacts.
 * The actual emails are sent by Loops automations.
 * 
 * GET /api/cron/welcome-back-sequence
 * 
 * Protected by CRON_SECRET environment variable
 * Runs daily at 11 AM UTC
 * 
 * Setup required in Loops:
 * 1. Create "Welcome Back Day 7" automation triggered by tag "welcome-back-day-7"
 *    - Email subject: "One Week In"
 * 2. Create "Welcome Back Day 14" automation triggered by tag "welcome-back-day-14"
 *    - Email subject: "We Miss You - Here's Something Special"
 * 
 * Email templates available in:
 * - @/lib/email/templates/nurture-day-7
 * - @/lib/email/templates/win-back-offer
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error("[v0] [Welcome Back Sequence] Unauthorized: Invalid or missing CRON_SECRET")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    } else if (!cronSecret && isProduction) {
      console.warn("[v0] [Welcome Back Sequence] WARNING: CRON_SECRET not set in production!")
    }

    console.log("[v0] [Welcome Back Sequence] Starting daily check...")

    const results = {
      day7: { found: 0, sent: 0, skipped: 0, failed: 0 },
      day14: { found: 0, sent: 0, skipped: 0, failed: 0 },
      errors: [] as Array<{ email: string; day: number; error: string }>,
    }

    // Get all users in welcome_back_sequence who haven't converted
    const sequences = await sql`
      SELECT *
      FROM welcome_back_sequence
      WHERE converted = false
      AND day_0_sent_at IS NOT NULL
    `

    console.log(`[v0] [Welcome Back Sequence] Found ${sequences.length} active sequences`)

    for (const seq of sequences) {
      const daysSinceSent = Math.floor(
        (Date.now() - new Date(seq.day_0_sent_at).getTime()) / (1000 * 60 * 60 * 24)
      )

      const firstName = seq.user_email.split("@")[0]

      // Check if user converted
      const hasPurchased = await checkIfConverted(seq.user_email)
      if (hasPurchased) {
        await sql`
          UPDATE welcome_back_sequence
          SET converted = true, converted_at = NOW(), updated_at = NOW()
          WHERE id = ${seq.id}
        `
        console.log(`[v0] [Welcome Back Sequence] ${seq.user_email} converted - stopping sequence`)
        continue
      }

      // DAY 7: Follow-up
      if (daysSinceSent >= 7 && !seq.day_7_email_sent) {
        results.day7.found++
        try {
          // Add user to Loops sequence by tagging them
          // This triggers the "Welcome Back Day 7" automation in Loops
          const loopsResult = await addLoopsContactTags(
            seq.user_email,
            ['welcome-back', 'welcome-back-day-7']
          )

          if (loopsResult.success) {
            await sql`
              UPDATE welcome_back_sequence
              SET day_7_email_sent = true, day_7_email_sent_at = NOW(), updated_at = NOW()
              WHERE id = ${seq.id}
            `
            results.day7.sent++
            console.log(`[v0] [Welcome Back Sequence] ✅ Tagged in Loops for Day 7 sequence: ${seq.user_email}`)
          } else {
            throw new Error(loopsResult.error || "Failed to add Loops tags")
          }
        } catch (error: any) {
          results.day7.failed++
          results.errors.push({
            email: seq.user_email,
            day: 7,
            error: error.message || "Unknown error",
          })
          console.error(`[v0] [Welcome Back Sequence] ❌ Failed to tag Day 7 in Loops for ${seq.user_email}:`, error)
        }
      }

      // DAY 14: Final offer
      if (daysSinceSent >= 14 && !seq.day_14_email_sent) {
        results.day14.found++
        try {
          // Add user to Loops sequence by tagging them
          // This triggers the "Welcome Back Day 14" automation in Loops
          const loopsResult = await addLoopsContactTags(
            seq.user_email,
            ['welcome-back', 'welcome-back-day-14', 'discount']
          )

          if (loopsResult.success) {
            await sql`
              UPDATE welcome_back_sequence
              SET day_14_email_sent = true, day_14_email_sent_at = NOW(), updated_at = NOW()
              WHERE id = ${seq.id}
            `
            results.day14.sent++
            console.log(`[v0] [Welcome Back Sequence] ✅ Tagged in Loops for Day 14 sequence: ${seq.user_email}`)
          } else {
            throw new Error(loopsResult.error || "Failed to add Loops tags")
          }
        } catch (error: any) {
          results.day14.failed++
          results.errors.push({
            email: seq.user_email,
            day: 14,
            error: error.message || "Unknown error",
          })
          console.error(`[v0] [Welcome Back Sequence] ❌ Failed to tag Day 14 in Loops for ${seq.user_email}:`, error)
        }
      }
    }

    const totalSent = results.day7.sent + results.day14.sent
    const totalFailed = results.day7.failed + results.day14.failed

    console.log("[v0] [Welcome Back Sequence] Results:", results)
    console.log(`[v0] [Welcome Back Sequence] Total: ${totalSent} triggered, ${totalFailed} failed`)

    return NextResponse.json({
      success: true,
      results,
      totalProcessed: sequences.length,
      totalSent,
      totalFailed,
    })
  } catch (error: any) {
    console.error("[v0] [Welcome Back Sequence] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * Check if user has converted (made a purchase)
 */
async function checkIfConverted(email: string): Promise<boolean> {
  try {
    // Check if user has any active subscriptions
    const subscriptions = await sql`
      SELECT id FROM subscriptions
      WHERE user_id IN (
        SELECT id FROM users WHERE email = ${email}
      )
      AND status = 'active'
      LIMIT 1
    `

    // Check if user has made any purchases
    const purchases = await sql`
      SELECT id FROM credit_transactions
      WHERE user_id IN (
        SELECT id FROM users WHERE email = ${email}
      )
      AND transaction_type = 'purchase'
      AND amount > 0
      LIMIT 1
    `

    return subscriptions.length > 0 || purchases.length > 0
  } catch (error) {
    console.error(`[v0] [Welcome Back Sequence] Error checking conversion for ${email}:`, error)
    return false // On error, assume not converted to continue sequence
  }
}
