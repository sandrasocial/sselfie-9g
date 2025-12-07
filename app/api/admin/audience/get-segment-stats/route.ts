import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getAllResendContacts } from "@/lib/audience/segment-sync"
import { neon } from "@neondatabase/serverless"

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ssa@ssasocial.com"
const sql = neon(process.env.DATABASE_URL!)

/**
 * Get Segment Statistics
 * 
 * Returns counts for each segment based on database queries
 * 
 * GET /api/admin/audience/get-segment-stats
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

    console.log("[v0] Fetching segment statistics...")

    // Get all Resend contacts
    const allContacts = await getAllResendContacts()
    const allEmails = allContacts.map((c) => c.email).filter(Boolean)

    console.log(`[v0] Analyzing ${allEmails.length} contacts for segment statistics`)

    // Query database for each segment type
    const [betaUsersResult, paidUsersResult, coldUsersResult] = await Promise.all([
      // Beta users
      sql`
        SELECT COUNT(DISTINCT u.email) as count
        FROM users u
        INNER JOIN subscriptions s ON u.id = s.user_id
        WHERE s.product_type = 'sselfie_studio_membership'
          AND s.is_test_mode = FALSE
          AND s.status = 'active'
          AND u.email = ANY(${allEmails})
      `,
      // Paid users
      sql`
        SELECT COUNT(DISTINCT u.email) as count
        FROM users u
        WHERE (
          EXISTS (
            SELECT 1 FROM subscriptions s
            WHERE s.user_id = u.id
              AND s.is_test_mode = FALSE
              AND s.status = 'active'
          )
          OR EXISTS (
            SELECT 1 FROM credit_transactions ct
            WHERE ct.user_id = u.id
              AND ct.transaction_type = 'purchase'
              AND ct.amount > 0
              AND ct.is_test_mode = FALSE
          )
        )
        AND u.email = ANY(${allEmails})
      `,
      // Cold users (no email activity in last 30 days)
      sql`
        SELECT COUNT(DISTINCT u.email) as count
        FROM users u
        WHERE u.email = ANY(${allEmails})
          AND NOT EXISTS (
            SELECT 1 FROM email_logs el
            WHERE el.user_email = u.email
              AND el.sent_at > NOW() - INTERVAL '30 days'
          )
      `,
    ])

    const stats = {
      totalContacts: allEmails.length,
      all_subscribers: allEmails.length, // All contacts are subscribers
      beta_users: Number.parseInt(betaUsersResult[0]?.count || "0", 10),
      paid_users: Number.parseInt(paidUsersResult[0]?.count || "0", 10),
      cold_users: Number.parseInt(coldUsersResult[0]?.count || "0", 10),
    }

    // Calculate percentages
    const percentages = {
      all_subscribers: 100,
      beta_users: stats.totalContacts > 0 ? ((stats.beta_users / stats.totalContacts) * 100).toFixed(1) : "0.0",
      paid_users: stats.totalContacts > 0 ? ((stats.paid_users / stats.totalContacts) * 100).toFixed(1) : "0.0",
      cold_users: stats.totalContacts > 0 ? ((stats.cold_users / stats.totalContacts) * 100).toFixed(1) : "0.0",
    }

    console.log("[v0] Segment statistics:", stats)

    return NextResponse.json({
      success: true,
      stats,
      percentages,
      message: "Segment statistics retrieved successfully",
    })
  } catch (error: any) {
    console.error("[v0] Error getting segment statistics:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get segment statistics",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}

