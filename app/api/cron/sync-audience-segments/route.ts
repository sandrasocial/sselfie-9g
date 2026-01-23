import { NextResponse } from "next/server"
import { getAllResendContacts, runSegmentationForEmails } from "@/lib/audience/segment-sync"
import { syncMarketingContacts } from "@/lib/email/marketing-sender"
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

    console.log(`[v0] [CRON] Found ${totalContacts} total contacts in Resend`)

    // Process in smaller batches to respect rate limits
    // Resend allows 2 requests/second
    // With up to 4 segments per contact, we need at least 2 seconds per contact (4 requests / 2 req/sec)
    // But we have 500ms delays built into updateContactTags, so we can process more per batch
    // Use batch size of 5 contacts per batch (with built-in delays, this is safe)
    const batchSize = 5
    const batches: Array<Array<{ email: string; id: string; tags?: any[] }>> = []
    for (let i = 0; i < allContacts.length; i += batchSize) {
      batches.push(allContacts.slice(i, i + batchSize))
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
      sequenceTags: {} as Record<
        string,
        { eligible: number; synced: number; skipped: number; errors: number }
      >,
    }

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      console.log(`[v0] [CRON] Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} contacts)`)

      // Run segmentation for this batch (pass full contact objects with tags)
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

    const sequenceJobs: Array<{
      tagKey: string
      query: typeof sql
    }> = [
      {
        tagKey: "sequence_blueprint_day_3",
        query: sql`
          SELECT bs.email, bs.name
          FROM blueprint_subscribers bs
          LEFT JOIN email_logs el ON el.user_email = bs.email AND el.email_type = 'blueprint-followup-day-3'
          WHERE bs.day_3_email_sent = FALSE
            AND bs.created_at <= NOW() - INTERVAL '3 days'
            AND bs.created_at > NOW() - INTERVAL '4 days'
            AND bs.welcome_email_sent = TRUE
            AND el.id IS NULL
        `,
      },
      {
        tagKey: "sequence_blueprint_day_7",
        query: sql`
          SELECT bs.email, bs.name
          FROM blueprint_subscribers bs
          LEFT JOIN email_logs el ON el.user_email = bs.email AND el.email_type = 'blueprint-followup-day-7'
          WHERE bs.day_7_email_sent = FALSE
            AND bs.created_at <= NOW() - INTERVAL '7 days'
            AND bs.created_at > NOW() - INTERVAL '8 days'
            AND bs.welcome_email_sent = TRUE
            AND el.id IS NULL
        `,
      },
      {
        tagKey: "sequence_blueprint_day_14",
        query: sql`
          SELECT bs.email, bs.name
          FROM blueprint_subscribers bs
          LEFT JOIN email_logs el ON el.user_email = bs.email AND el.email_type = 'blueprint-followup-day-14'
          WHERE bs.day_14_email_sent = FALSE
            AND bs.created_at <= NOW() - INTERVAL '14 days'
            AND bs.created_at > NOW() - INTERVAL '15 days'
            AND bs.welcome_email_sent = TRUE
            AND el.id IS NULL
        `,
      },
      {
        tagKey: "sequence_paid_blueprint_day_1",
        query: sql`
          SELECT bs.email, bs.name
          FROM blueprint_subscribers bs
          LEFT JOIN email_logs el ON el.user_email = bs.email AND el.email_type = 'paid-blueprint-day-1'
          LEFT JOIN users u ON u.email = bs.email
          LEFT JOIN subscriptions s ON s.user_id = u.id
            AND s.product_type = 'sselfie_studio_membership'
            AND s.status = 'active'
          WHERE bs.paid_blueprint_purchased = TRUE
            AND bs.day_1_paid_email_sent = FALSE
            AND bs.paid_blueprint_purchased_at <= NOW() - INTERVAL '1 day'
            AND bs.paid_blueprint_purchased_at > NOW() - INTERVAL '2 days'
            AND el.id IS NULL
            AND s.id IS NULL
        `,
      },
      {
        tagKey: "sequence_paid_blueprint_day_3",
        query: sql`
          SELECT bs.email, bs.name
          FROM blueprint_subscribers bs
          LEFT JOIN email_logs el ON el.user_email = bs.email AND el.email_type = 'paid-blueprint-day-3'
          LEFT JOIN users u ON u.email = bs.email
          LEFT JOIN subscriptions s ON s.user_id = u.id
            AND s.product_type = 'sselfie_studio_membership'
            AND s.status = 'active'
          WHERE bs.paid_blueprint_purchased = TRUE
            AND bs.day_3_paid_email_sent = FALSE
            AND bs.paid_blueprint_purchased_at <= NOW() - INTERVAL '3 days'
            AND bs.paid_blueprint_purchased_at > NOW() - INTERVAL '4 days'
            AND el.id IS NULL
            AND s.id IS NULL
        `,
      },
      {
        tagKey: "sequence_paid_blueprint_day_7",
        query: sql`
          SELECT bs.email, bs.name
          FROM blueprint_subscribers bs
          LEFT JOIN email_logs el ON el.user_email = bs.email AND el.email_type = 'paid-blueprint-day-7'
          LEFT JOIN users u ON u.email = bs.email
          LEFT JOIN subscriptions s ON s.user_id = u.id
            AND s.product_type = 'sselfie_studio_membership'
            AND s.status = 'active'
          WHERE bs.paid_blueprint_purchased = TRUE
            AND bs.day_7_paid_email_sent = FALSE
            AND bs.paid_blueprint_purchased_at <= NOW() - INTERVAL '7 days'
            AND bs.paid_blueprint_purchased_at > NOW() - INTERVAL '8 days'
            AND el.id IS NULL
            AND s.id IS NULL
        `,
      },
      {
        tagKey: "sequence_nurture_day_1",
        query: sql`
          SELECT fs.email, fs.name
          FROM freebie_subscribers fs
          LEFT JOIN email_logs el ON el.user_email = fs.email AND el.email_type = 'nurture-day-1'
          WHERE fs.converted_to_user = FALSE
            AND fs.created_at < NOW() - INTERVAL '1 day'
            AND fs.created_at >= NOW() - INTERVAL '2 days'
            AND el.id IS NULL
        `,
      },
      {
        tagKey: "sequence_nurture_day_3",
        query: sql`
          SELECT fs.email, fs.name
          FROM freebie_subscribers fs
          LEFT JOIN email_logs el ON el.user_email = fs.email AND el.email_type = 'nurture-day-3'
          WHERE fs.converted_to_user = FALSE
            AND fs.created_at < NOW() - INTERVAL '3 days'
            AND fs.created_at >= NOW() - INTERVAL '4 days'
            AND el.id IS NULL
        `,
      },
      {
        tagKey: "sequence_nurture_day_7",
        query: sql`
          SELECT fs.email, fs.name
          FROM freebie_subscribers fs
          LEFT JOIN email_logs el ON el.user_email = fs.email AND el.email_type = 'nurture-day-7'
          WHERE fs.converted_to_user = FALSE
            AND fs.created_at < NOW() - INTERVAL '7 days'
            AND fs.created_at >= NOW() - INTERVAL '8 days'
            AND el.id IS NULL
        `,
      },
      {
        tagKey: "sequence_nurture_day_10",
        query: sql`
          SELECT fs.email, fs.name
          FROM freebie_subscribers fs
          LEFT JOIN email_logs el ON el.user_email = fs.email AND el.email_type = 'nurture-day-10'
          WHERE fs.converted_to_user = FALSE
            AND fs.created_at < NOW() - INTERVAL '10 days'
            AND fs.created_at >= NOW() - INTERVAL '11 days'
            AND el.id IS NULL
        `,
      },
      {
        tagKey: "sequence_welcome_day_0",
        query: sql`
          SELECT DISTINCT u.email, u.display_name as name
          FROM users u
          INNER JOIN subscriptions s ON u.id = s.user_id::varchar
          LEFT JOIN email_logs el ON el.user_email = u.email AND el.email_type = 'welcome-day-0'
          WHERE u.created_at >= NOW() - INTERVAL '2 hours'
            AND u.created_at < NOW()
            AND s.status = 'active'
            AND s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership')
            AND s.is_test_mode = FALSE
            AND el.id IS NULL
        `,
      },
      {
        tagKey: "sequence_welcome_day_3",
        query: sql`
          SELECT DISTINCT u.email, u.display_name as name
          FROM users u
          INNER JOIN subscriptions s ON u.id = s.user_id::varchar
          LEFT JOIN email_logs el ON el.user_email = u.email AND el.email_type = 'welcome-day-3'
          WHERE u.created_at >= NOW() - INTERVAL '3 days 2 hours'
            AND u.created_at < NOW() - INTERVAL '3 days'
            AND s.status = 'active'
            AND s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership')
            AND s.is_test_mode = FALSE
            AND el.id IS NULL
        `,
      },
      {
        tagKey: "sequence_welcome_day_7",
        query: sql`
          SELECT DISTINCT u.email, u.display_name as name
          FROM users u
          INNER JOIN subscriptions s ON u.id = s.user_id::varchar
          LEFT JOIN email_logs el ON el.user_email = u.email AND el.email_type = 'welcome-day-7'
          WHERE u.created_at >= NOW() - INTERVAL '7 days 2 hours'
            AND u.created_at < NOW() - INTERVAL '7 days'
            AND s.status = 'active'
            AND s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership')
            AND s.is_test_mode = FALSE
            AND el.id IS NULL
        `,
      },
      {
        tagKey: "sequence_onboarding_day_0",
        query: sql`
          SELECT DISTINCT u.email, u.display_name as name
          FROM users u
          INNER JOIN subscriptions s ON u.id = s.user_id::varchar
          LEFT JOIN email_logs el ON el.user_email = u.email AND el.email_type = 'onboarding-day-0'
          WHERE s.status = 'active'
            AND s.product_type = 'sselfie_studio_membership'
            AND s.is_test_mode = FALSE
            AND s.created_at >= NOW() - INTERVAL '2 hours'
            AND s.created_at < NOW()
            AND u.email IS NOT NULL
            AND u.email != ''
            AND el.id IS NULL
        `,
      },
      {
        tagKey: "sequence_onboarding_day_2",
        query: sql`
          SELECT DISTINCT u.email, u.display_name as name
          FROM users u
          INNER JOIN subscriptions s ON u.id = s.user_id::varchar
          LEFT JOIN email_logs el ON el.user_email = u.email AND el.email_type = 'onboarding-day-2'
          WHERE s.status = 'active'
            AND s.product_type = 'sselfie_studio_membership'
            AND s.is_test_mode = FALSE
            AND s.created_at <= NOW() - INTERVAL '2 days'
            AND s.created_at > NOW() - INTERVAL '3 days'
            AND u.email IS NOT NULL
            AND u.email != ''
            AND el.id IS NULL
        `,
      },
      {
        tagKey: "sequence_onboarding_day_7",
        query: sql`
          SELECT DISTINCT u.email, u.display_name as name
          FROM users u
          INNER JOIN subscriptions s ON u.id = s.user_id::varchar
          LEFT JOIN email_logs el ON el.user_email = u.email AND el.email_type = 'onboarding-day-7'
          WHERE s.status = 'active'
            AND s.product_type = 'sselfie_studio_membership'
            AND s.is_test_mode = FALSE
            AND s.created_at <= NOW() - INTERVAL '7 days'
            AND s.created_at > NOW() - INTERVAL '8 days'
            AND u.email IS NOT NULL
            AND u.email != ''
            AND el.id IS NULL
        `,
      },
    ]

    for (const job of sequenceJobs) {
      const rows = await job.query
      if (rows.length === 0) {
        results.sequenceTags[job.tagKey] = { eligible: 0, synced: 0, skipped: 0, errors: 0 }
        continue
      }

      const contacts = rows.map((row: any) => ({
        email: row.email,
        firstName: row.name?.split(" ")[0],
      }))

      const syncResult = await syncMarketingContacts({
        tagKey: job.tagKey,
        tagValue: "true",
        contacts,
        existingContacts: allContacts,
      })

      results.sequenceTags[job.tagKey] = {
        eligible: contacts.length,
        synced: syncResult.synced,
        skipped: syncResult.skipped,
        errors: syncResult.errors,
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cron sync completed: ${results.successful} successful, ${results.failed} failed`,
      summary: {
        totalContacts,
        processed: results.processed,
        successful: results.successful,
        failed: results.failed,
        segmentCounts: results.segmentCounts,
        sequenceTags: results.sequenceTags,
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

