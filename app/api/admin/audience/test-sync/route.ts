import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { runSegmentationForEmails } from "@/lib/audience/segment-sync"

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ssa@ssasocial.com"

/**
 * Test Sync Route - Phase 1
 * 
 * Runs segmentation for admin email only to test the logic before global sync.
 * 
 * POST /api/admin/audience/test-sync
 * 
 * Returns:
 * - Email address tested
 * - Which segments were applied
 * - Database flags (beta, paid, cold)
 * - Reasoning for each segment
 */
export async function POST(request: Request) {
  try {
    // Admin authentication check (reuse existing pattern)
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

    console.log(`[v0] Test sync requested for admin email: ${ADMIN_EMAIL}`)

    // Run segmentation for admin email only
    const results = await runSegmentationForEmails([ADMIN_EMAIL])

    if (results.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No results returned from segmentation",
      }, { status: 500 })
    }

    const result = results[0]

    // Return detailed result
    return NextResponse.json({
      success: true,
      message: `Test sync completed for ${ADMIN_EMAIL}`,
      testEmail: ADMIN_EMAIL,
      result: {
        email: result.email,
        segments: result.segments,
        reasoning: result.reasoning,
        tagsUpdated: result.tagsUpdated,
        error: result.error,
      },
      summary: {
        all_subscribers: result.segments.all_subscribers ? "✓ Tagged" : "✗ Not tagged",
        beta_users: result.segments.beta_users ? "✓ Tagged" : "✗ Not tagged",
        paid_users: result.segments.paid_users ? "✓ Tagged" : "✗ Not tagged",
        cold_users: result.segments.cold_users ? "✓ Tagged" : "✗ Not tagged",
      },
      nextSteps: [
        "1. Check Resend dashboard to verify tags were applied correctly",
        "2. Review the reasoning to understand why each segment was/wasn't applied",
        "3. If results look correct, proceed to Phase 2 (limited batch sync)",
        "4. If tags weren't updated, check the error message",
      ],
    })
  } catch (error: any) {
    console.error("[v0] Error in test sync:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to run test sync",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}

