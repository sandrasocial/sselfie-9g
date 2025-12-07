import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getAllResendContacts, runSegmentationForEmails } from "@/lib/audience/segment-sync"
import { neon } from "@neondatabase/serverless"

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ssa@ssasocial.com"
const sql = neon(process.env.DATABASE_URL!)

/**
 * Master Sync Route - Phase 2
 * 
 * Syncs all Resend contacts into correct segments based on Neon database data.
 * 
 * POST /api/admin/audience/sync-segments
 * 
 * Request body:
 * {
 *   dryRun?: boolean,    // If true, don't actually update segments, just return what would be done
 *   limit?: number,      // Optional: limit number of contacts to process (for testing)
 *   batchSize?: number   // Optional: number of contacts to process per batch (default: 100)
 * }
 */
export async function POST(request: Request) {
  try {
    // Admin authentication check
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { dryRun = false, limit, batchSize = 100 } = body

    console.log(`[v0] Starting full audience sync (dryRun: ${dryRun}, limit: ${limit || "none"}, batchSize: ${batchSize})`)

    // Fetch all contacts from Resend
    console.log("[v0] Fetching all contacts from Resend...")
    const allContacts = await getAllResendContacts()
    const totalContacts = allContacts.length

    console.log(`[v0] Found ${totalContacts} total contacts in Resend`)

    // Apply limit if specified (for testing)
    const contactsToProcess = limit ? allContacts.slice(0, limit) : allContacts

    console.log(`[v0] Processing ${contactsToProcess.length} contact(s)`)

    // Process in batches to avoid rate limits and memory issues
    // Resend rate limit: 2 requests/second
    // With up to 4 segments per contact, we need at least 2 seconds per contact
    // Use smaller batches to respect rate limits better
    const effectiveBatchSize = Math.min(batchSize, 10) // Max 10 contacts per batch to respect rate limits
    const batches: Array<Array<{ email: string; id: string; tags?: any[] }>> = []
    for (let i = 0; i < contactsToProcess.length; i += effectiveBatchSize) {
      batches.push(contactsToProcess.slice(i, i + effectiveBatchSize))
    }

    console.log(`[v0] Split into ${batches.length} batch(es) of up to ${effectiveBatchSize} contacts each (respecting 2 req/sec rate limit)`)

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
      console.log(`[v0] Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} contacts)`)

      if (!dryRun) {
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
                'segment_sync',
                ${result.tagsUpdated ? 'success' : 'failed'},
                NOW()
              )
            `
          } catch (logError) {
            console.error(`[v0] Failed to log segment sync for ${result.email}:`, logError)
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

        // Small delay between batches to avoid rate limiting
        // Note: Rate limiting is handled within runSegmentationForEmails (500ms between segment additions)
        // But we add extra delay between batches to be safe
        if (batchIndex < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000)) // 2 second delay between batches
        }
      } else {
        // Dry run: just simulate processing
        console.log(`[v0] [DRY RUN] Would process ${batch.length} contacts in this batch`)
        results.processed += batch.length
        results.successful += batch.length // Assume success in dry run
      }
    }

    console.log(`[v0] Sync completed: ${results.successful} successful, ${results.failed} failed`)

    return NextResponse.json({
      success: true,
      message: dryRun
        ? `Dry run completed. Would process ${results.processed} contacts.`
        : `Sync completed: ${results.successful} successful, ${results.failed} failed`,
      dryRun,
      summary: {
        totalContacts,
        processed: results.processed,
        successful: results.successful,
        failed: results.failed,
        segmentCounts: results.segmentCounts,
      },
      errors: results.errors.slice(0, 50), // Limit errors in response
      totalErrors: results.errors.length,
      nextSteps: dryRun
        ? [
            "1. Review the summary above",
            "2. If everything looks correct, run again without dryRun: true",
            "3. Monitor the sync progress in server logs",
          ]
        : [
            "1. Check Resend dashboard to verify segments were updated",
            "2. Review errors if any",
            "3. Run periodic syncs to keep segments up to date",
          ],
    })
  } catch (error: any) {
    console.error("[v0] Error in full sync:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to run full sync",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}

/**
 * GET endpoint to check sync status and get segment statistics
 */
export async function GET() {
  try {
    // Admin authentication check
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    // Get recent sync activity from email_logs
    const recentSyncs = await sql`
      SELECT 
        COUNT(*) as total_syncs,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_syncs,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_syncs,
        MAX(sent_at) as last_sync_at
      FROM email_logs
      WHERE email_type = 'segment_sync'
      AND sent_at > NOW() - INTERVAL '24 hours'
    `

    // Get total contacts
    const allContacts = await getAllResendContacts()
    const totalContacts = allContacts.length

    return NextResponse.json({
      success: true,
      stats: {
        totalContacts,
        recentSyncs: recentSyncs[0] || {
          total_syncs: 0,
          successful_syncs: 0,
          failed_syncs: 0,
          last_sync_at: null,
        },
      },
      message: "Sync status retrieved successfully",
    })
  } catch (error: any) {
    console.error("[v0] Error getting sync status:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get sync status",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}

