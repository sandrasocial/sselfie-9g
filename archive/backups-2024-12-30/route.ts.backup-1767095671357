import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { addLoopsContactTags } from '@/lib/loops/manage-contact'

const sql = neon(process.env.DATABASE_URL!)

/**
 * Blueprint Email Sequence - Loops Integration
 * 
 * This cron job triggers Loops sequences by adding tags to contacts.
 * The actual emails are sent by Loops automations.
 * 
 * GET /api/cron/blueprint-email-sequence
 * 
 * Protected by CRON_SECRET environment variable
 * Runs daily at 10 AM UTC
 * 
 * Setup required in Loops:
 * 1. Create "Blueprint Upsell Day 3" automation triggered by tag "blueprint-upsell-day-3"
 *    - Email subject: "Ready for the Next Level?"
 * 2. Create "Blueprint Nurture Day 7" automation triggered by tag "blueprint-upsell-day-7"
 *    - Email subject: "One Week In"
 * 3. Create "Blueprint Upsell Day 10" automation triggered by tag "blueprint-upsell-day-10"
 *    - Email subject: "Ready for the Next Level?"
 * 4. Create "Blueprint Win Back Day 14" automation triggered by tag "blueprint-upsell-day-14"
 *    - Email subject: "We Miss You - Here's Something Special"
 * 
 * Email templates available in:
 * - @/lib/email/templates/upsell-freebie-membership
 * - @/lib/email/templates/nurture-day-7
 * - @/lib/email/templates/upsell-day-10
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
        console.error("[v0] [Blueprint Sequence] Unauthorized: Invalid or missing CRON_SECRET")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    } else if (!cronSecret && isProduction) {
      console.warn("[v0] [Blueprint Sequence] WARNING: CRON_SECRET not set in production!")
    }

    console.log("[v0] [Blueprint Sequence] Starting daily check...")

    const results = {
      day3: { found: 0, sent: 0, skipped: 0, failed: 0 },
      day7: { found: 0, sent: 0, skipped: 0, failed: 0 },
      day10: { found: 0, sent: 0, skipped: 0, failed: 0 },
      day14: { found: 0, sent: 0, skipped: 0, failed: 0 },
      errors: [] as Array<{ email: string; day: number; error: string }>,
    }

    // Get all blueprint subscribers who haven't converted
    const subscribers = await sql`
      SELECT 
        id, email, name, created_at,
        day_3_email_sent, day_7_email_sent, 
        day_10_email_sent, day_14_email_sent,
        converted_to_user
      FROM blueprint_subscribers
      WHERE blueprint_completed = true
      AND converted_to_user = false
    `

    console.log(`[v0] [Blueprint Sequence] Found ${subscribers.length} active blueprint subscribers`)

    for (const subscriber of subscribers) {
      const daysSinceSignup = Math.floor(
        (Date.now() - new Date(subscriber.created_at).getTime()) / (1000 * 60 * 60 * 24)
      )

      const firstName = subscriber.name?.split(" ")[0] || subscriber.email.split("@")[0]

      // Check if user has purchased (stop sending if converted)
      const hasPurchased = await checkIfConverted(subscriber.email)
      if (hasPurchased) {
        await sql`
          UPDATE blueprint_subscribers
          SET converted_to_user = true, updated_at = NOW()
          WHERE id = ${subscriber.id}
        `
        console.log(`[v0] [Blueprint Sequence] ${subscriber.email} converted - stopping sequence`)
        continue
      }

      // DAY 3: Upsell email
      if (daysSinceSignup >= 3 && !subscriber.day_3_email_sent) {
        results.day3.found++
        try {
          // Add user to Loops sequence by tagging them
          // This triggers the "Blueprint Upsell Day 3" automation in Loops
          const loopsResult = await addLoopsContactTags(
            subscriber.email,
            ['blueprint-subscriber', 'blueprint-upsell-day-3']
          )

          if (loopsResult.success) {
            await sql`
              UPDATE blueprint_subscribers
              SET day_3_email_sent = true, day_3_email_sent_at = NOW(), updated_at = NOW()
              WHERE id = ${subscriber.id}
            `
            results.day3.sent++
            console.log(`[v0] [Blueprint Sequence] ✅ Tagged in Loops for Day 3 sequence: ${subscriber.email}`)
          } else {
            throw new Error(loopsResult.error || "Failed to add Loops tags")
          }
        } catch (error: any) {
          results.day3.failed++
          results.errors.push({
            email: subscriber.email,
            day: 3,
            error: error.message || "Unknown error",
          })
          console.error(`[v0] [Blueprint Sequence] ❌ Failed to tag Day 3 in Loops for ${subscriber.email}:`, error)
        }
      }

      // DAY 7: Nurture email
      if (daysSinceSignup >= 7 && !subscriber.day_7_email_sent) {
        results.day7.found++
        try {
          // Add user to Loops sequence by tagging them
          // This triggers the "Blueprint Nurture Day 7" automation in Loops
          const loopsResult = await addLoopsContactTags(
            subscriber.email,
            ['blueprint-subscriber', 'blueprint-upsell-day-7']
          )

          if (loopsResult.success) {
            await sql`
              UPDATE blueprint_subscribers
              SET day_7_email_sent = true, day_7_email_sent_at = NOW(), updated_at = NOW()
              WHERE id = ${subscriber.id}
            `
            results.day7.sent++
            console.log(`[v0] [Blueprint Sequence] ✅ Tagged in Loops for Day 7 sequence: ${subscriber.email}`)
          } else {
            throw new Error(loopsResult.error || "Failed to add Loops tags")
          }
        } catch (error: any) {
          results.day7.failed++
          results.errors.push({
            email: subscriber.email,
            day: 7,
            error: error.message || "Unknown error",
          })
          console.error(`[v0] [Blueprint Sequence] ❌ Failed to tag Day 7 in Loops for ${subscriber.email}:`, error)
        }
      }

      // DAY 10: Extended upsell
      if (daysSinceSignup >= 10 && !subscriber.day_10_email_sent) {
        results.day10.found++
        try {
          // Add user to Loops sequence by tagging them
          // This triggers the "Blueprint Upsell Day 10" automation in Loops
          const loopsResult = await addLoopsContactTags(
            subscriber.email,
            ['blueprint-subscriber', 'blueprint-upsell-day-10']
          )

          if (loopsResult.success) {
            await sql`
              UPDATE blueprint_subscribers
              SET day_10_email_sent = true, day_10_email_sent_at = NOW(), updated_at = NOW()
              WHERE id = ${subscriber.id}
            `
            results.day10.sent++
            console.log(`[v0] [Blueprint Sequence] ✅ Tagged in Loops for Day 10 sequence: ${subscriber.email}`)
          } else {
            throw new Error(loopsResult.error || "Failed to add Loops tags")
          }
        } catch (error: any) {
          results.day10.failed++
          results.errors.push({
            email: subscriber.email,
            day: 10,
            error: error.message || "Unknown error",
          })
          console.error(`[v0] [Blueprint Sequence] ❌ Failed to tag Day 10 in Loops for ${subscriber.email}:`, error)
        }
      }

      // DAY 14: Final offer with discount
      if (daysSinceSignup >= 14 && !subscriber.day_14_email_sent) {
        results.day14.found++
        try {
          // Add user to Loops sequence by tagging them
          // This triggers the "Blueprint Win Back Day 14" automation in Loops
          const loopsResult = await addLoopsContactTags(
            subscriber.email,
            ['blueprint-subscriber', 'blueprint-upsell-day-14', 'discount']
          )

          if (loopsResult.success) {
            await sql`
              UPDATE blueprint_subscribers
              SET day_14_email_sent = true, day_14_email_sent_at = NOW(), updated_at = NOW()
              WHERE id = ${subscriber.id}
            `
            results.day14.sent++
            console.log(`[v0] [Blueprint Sequence] ✅ Tagged in Loops for Day 14 sequence: ${subscriber.email}`)
          } else {
            throw new Error(loopsResult.error || "Failed to add Loops tags")
          }
        } catch (error: any) {
          results.day14.failed++
          results.errors.push({
            email: subscriber.email,
            day: 14,
            error: error.message || "Unknown error",
          })
          console.error(`[v0] [Blueprint Sequence] ❌ Failed to tag Day 14 in Loops for ${subscriber.email}:`, error)
        }
      }
    }

    const totalSent = results.day3.sent + results.day7.sent + results.day10.sent + results.day14.sent
    const totalFailed = results.day3.failed + results.day7.failed + results.day10.failed + results.day14.failed

    console.log("[v0] [Blueprint Sequence] Results:", results)
    console.log(`[v0] [Blueprint Sequence] Total: ${totalSent} triggered, ${totalFailed} failed`)

    return NextResponse.json({
      success: true,
      results,
      totalProcessed: subscribers.length,
      totalSent,
      totalFailed,
    })
  } catch (error: any) {
    console.error("[v0] [Blueprint Sequence] Error:", error)
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
    console.error(`[v0] [Blueprint Sequence] Error checking conversion for ${email}:`, error)
    return false // On error, assume not converted to continue sequence
  }
}
