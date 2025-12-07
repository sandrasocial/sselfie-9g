import { NextResponse } from "next/server"
import { getAllResendContacts, runSegmentationForEmails } from "@/lib/audience/segment-sync"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Cron Job Route for Periodic Audience Segment Sync
 * 
 * This route is called by Vercel Cron Jobs to automatically sync
 * Resend contacts into correct segments on a schedule.
 * 
 * GET /api/cron/sync-audience-segments
 * 
 * Protected by CRON_SECRET environment variable
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    // Vercel automatically adds CRON_SECRET to Authorization header for cron jobs
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    // Only check in production (local testing can skip)
    const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"
    
    if (isProduction && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error("[v0] [CRON] Unauthorized: Invalid or missing CRON_SECRET")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    } else if (!cronSecret && isProduction) {
      console.warn("[v0] [CRON] WARNING: CRON_SECRET not set in production!")
    }

    console.log("[v0] [CRON] Starting periodic audience segment sync...")

    // Fetch all contacts from Resend
    const allContacts = await getAllResendContacts()
    const totalContacts = allContacts.length
    const emails = allContacts.map((c) => c.email).filter(Boolean)

    console.log(`[v0] [CRON] Found ${totalContacts} total contacts in Resend`)

    // Process in smaller batches to respect rate limits
    // Resend allows 2 requests/second
    // With up to 4 segments per contact, we need at least 2 seconds per contact (4 requests / 2 req/sec)
    // But we have 500ms delays built into updateContactTags, so we can process more per batch
    // Use batch size of 10 contacts per batch (with built-in delays, this is safe)
    const batchSize = 10
    const batches: string[][] = []
    for (let i = 0; i < emails.length; i += batchSize) {
      batches.push(emails.slice(i, i + batchSize))
    }

    console.log(`[v0] [CRON] Split into ${batches.length} batch(es) of up to ${batchSize} contacts each`)

    const results = {
      totalContacts,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ email: string; error: string }>,
      segmentCounts: {
        all_subscribers: 0,
        beta_users: 0,
        paid_users: 0,
        cold_users: 0,
      },
    }

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      console.log(`[v0] [CRON] Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} contacts)`)

      // Run segmentation for this batch
      const batchResults = await runSegmentationForEmails(batch)

      // Process results
      for (const result of batchResults) {
        results.processed++

        // Log to email_logs
        try {
          await sql`
            INSERT INTO email_logs (
              user_email,
              email_type,
              status,
              sent_at
            ) VALUES (
              ${result.email},
              'segment_sync_cron',
              ${result.tagsUpdated ? 'success' : 'failed'},
              NOW()
            )
          `
        } catch (logError) {
          console.error(`[v0] [CRON] Failed to log segment sync for ${result.email}:`, logError)
        }

        if (result.tagsUpdated) {
          results.successful++

          // Count segments
          if (result.segments.all_subscribers) results.segmentCounts.all_subscribers++
          if (result.segments.beta_users) results.segmentCounts.beta_users++
          if (result.segments.paid_users) results.segmentCounts.paid_users++
          if (result.segments.cold_users) results.segmentCounts.cold_users++
        } else {
          results.failed++
          if (result.error) {
            results.errors.push({ email: result.email, error: result.error })
          }
        }
      }

      // Delay between batches to respect rate limits
      // With 10 contacts per batch and 4 segments max per contact = 40 requests max
      // At 2 requests/second, that's 20 seconds per batch
      // With built-in 500ms delays, actual time is ~25 seconds per batch
      // Add small buffer: 5 seconds between batches
      if (batchIndex < batches.length - 1) {
        console.log(`[v0] [CRON] Waiting 5 seconds before next batch...`)
        await new Promise((resolve) => setTimeout(resolve, 5000))
      }
    }

    console.log(`[v0] [CRON] Sync completed: ${results.successful} successful, ${results.failed} failed`)

    return NextResponse.json({
      success: true,
      message: `Cron sync completed: ${results.successful} successful, ${results.failed} failed`,
      summary: {
        totalContacts,
        processed: results.processed,
        successful: results.successful,
        failed: results.failed,
        segmentCounts: results.segmentCounts,
      },
      errors: results.errors.slice(0, 10), // Limit errors in response
      totalErrors: results.errors.length,
    })
  } catch (error: any) {
    console.error("[v0] [CRON] Error in cron sync:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to run cron sync",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}

