import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getAllResendContacts, runSegmentationForEmails } from "@/lib/audience/segment-sync"
import { neon } from "@neondatabase/serverless"

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ssa@ssasocial.com"
const sql = neon(process.env.DATABASE_URL!)

/**
 * Test Cron Endpoint
 * 
 * Tests the cron sync logic with a small batch (5 contacts)
 * Admin-only endpoint for testing
 * 
 * POST /api/admin/audience/test-cron
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

    console.log("[v0] [TEST CRON] Starting test cron sync...")

    // Fetch all contacts from Resend
    const allContacts = await getAllResendContacts()
    const totalContacts = allContacts.length
    const emails = allContacts.map((c) => c.email).filter(Boolean)

    // Test with only 5 contacts
    const testEmails = emails.slice(0, 5)
    console.log(`[v0] [TEST CRON] Testing with ${testEmails.length} contacts (out of ${totalContacts} total)`)

    // Run segmentation
    const batchResults = await runSegmentationForEmails(testEmails)

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

    // Process results
    for (const result of batchResults) {
      results.processed++

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

    return NextResponse.json({
      success: true,
      message: `Test cron sync completed: ${results.successful} successful, ${results.failed} failed`,
      summary: {
        totalContacts,
        processed: results.processed,
        successful: results.successful,
        failed: results.failed,
        segmentCounts: results.segmentCounts,
      },
      errors: results.errors,
      note: "This is a test with only 5 contacts. The actual cron job processes all contacts.",
    })
  } catch (error: any) {
    console.error("[v0] [TEST CRON] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to run test cron",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}

