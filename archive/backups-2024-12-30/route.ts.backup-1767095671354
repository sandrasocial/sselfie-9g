import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { addLoopsContactTags } from '@/lib/loops/manage-contact'

const sql = neon(process.env.DATABASE_URL!)

/**
 * Blueprint Followup Sequence - Loops Integration
 * 
 * This cron job triggers Loops sequences by adding tags to contacts.
 * The actual emails are sent by Loops automations.
 * 
 * GET /api/cron/send-blueprint-followups
 * 
 * Protected by CRON_SECRET environment variable
 * Runs daily at 10 AM UTC
 * 
 * Setup required in Loops:
 * 1. Create "Blueprint Day 3" automation triggered by tag "blueprint-day-3"
 *    - Email subject: "3 Ways to Use Your Blueprint This Week"
 * 2. Create "Blueprint Day 7" automation triggered by tag "blueprint-day-7"
 *    - Email subject: "[Name] went from 5K to 25K followers using this system"
 * 3. Create "Blueprint Day 14" automation triggered by tag "blueprint-day-14"
 *    - Email subject: "Still thinking about it? Here's $10 off 💕"
 * 
 * Email templates available in:
 * - @/lib/email/templates/blueprint-followup-day-3
 * - @/lib/email/templates/blueprint-followup-day-7
 * - @/lib/email/templates/blueprint-followup-day-14
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error("[v0] [CRON] Unauthorized: Invalid or missing CRON_SECRET")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    } else if (!cronSecret && isProduction) {
      console.warn("[v0] [CRON] WARNING: CRON_SECRET not set in production!")
    }

    console.log("[v0] [CRON] Starting blueprint follow-up email sequence...")

    const results = {
      day3: { found: 0, sent: 0, failed: 0 },
      day7: { found: 0, sent: 0, failed: 0 },
      day14: { found: 0, sent: 0, failed: 0 },
      errors: [] as Array<{ email: string; day: number; error: string }>,
    }

    const now = new Date()

    // Day 3 emails: 3 days after created_at, not yet sent
    const day3Subscribers = await sql`
      SELECT id, email, name, form_data, created_at
      FROM blueprint_subscribers
      WHERE day_3_email_sent = FALSE
        AND created_at <= NOW() - INTERVAL '3 days'
        AND created_at > NOW() - INTERVAL '4 days'
        AND welcome_email_sent = TRUE
      ORDER BY created_at ASC
    `

    results.day3.found = day3Subscribers.length
    console.log(`[v0] [CRON] Found ${day3Subscribers.length} subscribers for Day 3 email`)

    for (const subscriber of day3Subscribers) {
      try {
        // Add user to Loops sequence by tagging them
        // This triggers the "Blueprint Day 3" automation in Loops
        const loopsResult = await addLoopsContactTags(
          subscriber.email,
          ['blueprint-subscriber', 'blueprint-day-3']
        )

        if (loopsResult.success) {
          // Mark as sent (sequence triggered)
          await sql`
            UPDATE blueprint_subscribers
            SET 
              day_3_email_sent = TRUE,
              day_3_email_sent_at = NOW(),
              updated_at = NOW()
            WHERE id = ${subscriber.id}
          `

          // Log to email_logs
          await sql`
            INSERT INTO email_logs (
              user_email,
              email_type,
              status,
              sent_at
            )
            VALUES (
              ${subscriber.email},
              'blueprint_followup_day3_loops',
              'triggered',
              NOW()
            )
          `

          results.day3.sent++
          console.log(`[v0] [CRON] ✅ Tagged in Loops for Day 3 sequence: ${subscriber.email}`)
        } else {
          throw new Error(loopsResult.error || 'Failed to add Loops tags')
        }
      } catch (error: any) {
        results.day3.failed++
        results.errors.push({
          email: subscriber.email,
          day: 3,
          error: error.message || "Unknown error",
        })
        console.error(`[v0] [CRON] ❌ Failed to tag Day 3 in Loops for ${subscriber.email}:`, error)
      }
    }

    // Day 7 emails: 7 days after created_at, not yet sent
    const day7Subscribers = await sql`
      SELECT id, email, name, form_data, created_at
      FROM blueprint_subscribers
      WHERE day_7_email_sent = FALSE
        AND created_at <= NOW() - INTERVAL '7 days'
        AND created_at > NOW() - INTERVAL '8 days'
        AND welcome_email_sent = TRUE
      ORDER BY created_at ASC
    `

    results.day7.found = day7Subscribers.length
    console.log(`[v0] [CRON] Found ${day7Subscribers.length} subscribers for Day 7 email`)

    for (const subscriber of day7Subscribers) {
      try {
        // Add user to Loops sequence by tagging them
        // This triggers the "Blueprint Day 7" automation in Loops
        const loopsResult = await addLoopsContactTags(
          subscriber.email,
          ['blueprint-subscriber', 'blueprint-day-7']
        )

        if (loopsResult.success) {
          // Mark as sent (sequence triggered)
          await sql`
            UPDATE blueprint_subscribers
            SET 
              day_7_email_sent = TRUE,
              day_7_email_sent_at = NOW(),
              updated_at = NOW()
            WHERE id = ${subscriber.id}
          `

          // Log to email_logs
          await sql`
            INSERT INTO email_logs (
              user_email,
              email_type,
              status,
              sent_at
            )
            VALUES (
              ${subscriber.email},
              'blueprint_followup_day7_loops',
              'triggered',
              NOW()
            )
          `

          results.day7.sent++
          console.log(`[v0] [CRON] ✅ Tagged in Loops for Day 7 sequence: ${subscriber.email}`)
        } else {
          throw new Error(loopsResult.error || 'Failed to add Loops tags')
        }
      } catch (error: any) {
        results.day7.failed++
        results.errors.push({
          email: subscriber.email,
          day: 7,
          error: error.message || "Unknown error",
        })
        console.error(`[v0] [CRON] ❌ Failed to tag Day 7 in Loops for ${subscriber.email}:`, error)
      }
    }

    // Day 14 emails: 14 days after created_at, not yet sent
    const day14Subscribers = await sql`
      SELECT id, email, name, form_data, created_at
      FROM blueprint_subscribers
      WHERE day_14_email_sent = FALSE
        AND created_at <= NOW() - INTERVAL '14 days'
        AND created_at > NOW() - INTERVAL '15 days'
        AND welcome_email_sent = TRUE
      ORDER BY created_at ASC
    `

    results.day14.found = day14Subscribers.length
    console.log(`[v0] [CRON] Found ${day14Subscribers.length} subscribers for Day 14 email`)

    for (const subscriber of day14Subscribers) {
      try {
        // Add user to Loops sequence by tagging them
        // This triggers the "Blueprint Day 14" automation in Loops
        const loopsResult = await addLoopsContactTags(
          subscriber.email,
          ['blueprint-subscriber', 'blueprint-day-14', 'discount']
        )

        if (loopsResult.success) {
          // Mark as sent (sequence triggered)
          await sql`
            UPDATE blueprint_subscribers
            SET 
              day_14_email_sent = TRUE,
              day_14_email_sent_at = NOW(),
              updated_at = NOW()
            WHERE id = ${subscriber.id}
          `

          // Log to email_logs
          await sql`
            INSERT INTO email_logs (
              user_email,
              email_type,
              status,
              sent_at
            )
            VALUES (
              ${subscriber.email},
              'blueprint_followup_day14_loops',
              'triggered',
              NOW()
            )
          `

          results.day14.sent++
          console.log(`[v0] [CRON] ✅ Tagged in Loops for Day 14 sequence: ${subscriber.email}`)
        } else {
          throw new Error(loopsResult.error || 'Failed to add Loops tags')
        }
      } catch (error: any) {
        results.day14.failed++
        results.errors.push({
          email: subscriber.email,
          day: 14,
          error: error.message || "Unknown error",
        })
        console.error(`[v0] [CRON] ❌ Failed to tag Day 14 in Loops for ${subscriber.email}:`, error)
      }
    }

    const totalSent = results.day3.sent + results.day7.sent + results.day14.sent
    const totalFailed = results.day3.failed + results.day7.failed + results.day14.failed

    console.log(
      `[v0] [CRON] Follow-up sequence completed: ${totalSent} triggered, ${totalFailed} failed`,
    )

    return NextResponse.json({
      success: true,
      message: `Blueprint follow-ups triggered: ${totalSent} successful, ${totalFailed} failed`,
      summary: {
        day3: results.day3,
        day7: results.day7,
        day14: results.day14,
        totalSent,
        totalFailed,
      },
      errors: results.errors.slice(0, 10), // Limit errors in response
      totalErrors: results.errors.length,
    })
  } catch (error: any) {
    console.error("[v0] [CRON] Error in blueprint follow-up cron:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to run blueprint follow-up cron",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}
