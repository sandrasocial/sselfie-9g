// Feed Planner Phase 2c - monthly rollover. On the 1st, Maya drafts the new month for every
// eligible calendar owner who does not yet have that month's plan. The per-user writer remains
// idempotent, so a retry or a simultaneous first app open cannot create duplicate plans.
//
// Kill switch: FEED_PLAN_MONTHLY_DRAFT_DISABLED=true skips the whole run (matches the
// established recovery-cron pattern, e.g. MEMBERSHIP_CHECKOUT_RECOVERY_DISABLED).

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { draftMonthPlanForUser } from "@/lib/feed-planner/auto-draft"
import { getFeedPlannerAccess } from "@/lib/feed-planner/access-control"
import { currentPeriodMonth } from "@/lib/feed-planner/write-auto-draft"

export const dynamic = "force-dynamic"
export const maxDuration = 300

// LLM spend guard: far above today's member count, low enough that a data bug can't burn
// hundreds of drafts in one run.
const MAX_USERS_PER_RUN = 50

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 })
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (process.env.FEED_PLAN_MONTHLY_DRAFT_DISABLED === "true") {
    return NextResponse.json({ skipped: true, reason: "kill_switch" })
  }

  const thisMonth = currentPeriodMonth()

  try {
    // Candidate selection follows current access, not last month's activity. This prevents a
    // newly entitled member from being skipped forever because she had no previous plan.
    const candidates = await sql`
      SELECT u.id AS user_id, u.supabase_user_id, u.stack_auth_id
      FROM users u
      WHERE (
          u.role = 'admin'
          OR EXISTS (
            SELECT 1
            FROM blueprint_subscribers bp
            WHERE bp.user_id = u.id
              AND bp.paid_blueprint_purchased = TRUE
          )
          OR EXISTS (
            SELECT 1
            FROM subscriptions s
            WHERE s.user_id = u.id
              AND s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro', 'one_time_session')
              AND COALESCE(s.is_test_mode, FALSE) = FALSE
              AND (
                s.status IN ('active', 'trialing')
                OR (s.status IN ('canceled', 'cancelled', 'past_due') AND s.current_period_end > NOW())
              )
          )
        )
        AND NOT EXISTS (
          SELECT 1 FROM feed_layouts nxt
          WHERE nxt.user_id = u.id AND nxt.period_month = ${thisMonth}
        )
      ORDER BY u.id
      LIMIT ${MAX_USERS_PER_RUN}
    `

    let drafted = 0
    let skipped = 0
    let failed = 0

    for (const row of candidates) {
      const authUserId = (row.supabase_user_id || row.stack_auth_id) as string | null
      if (!authUserId) {
        skipped += 1
        continue
      }
      try {
        // Entitlement re-check so a member who canceled since last month isn't drafted for.
        // Must be the NEON users.id (subscriptions.user_id stores that, not the auth id) -
        // passing authUserId here made the cron silently skip every member whose auth id
        // differs from users.id, which is all but one account.
        const access = await getFeedPlannerAccess(String(row.user_id))
        if (!access.isMembership && !access.isPaidBlueprint) {
          skipped += 1
          continue
        }
        const outcome = await draftMonthPlanForUser(authUserId, row.user_id)
        if (outcome.created) drafted += 1
        else skipped += 1
      } catch (e) {
        failed += 1
        console.error(`[feed-plan monthly draft] user ${row.user_id} failed:`, e)
      }
    }

    console.log(
      `[feed-plan monthly draft] month=${thisMonth} candidates=${candidates.length} drafted=${drafted} skipped=${skipped} failed=${failed}`,
    )
    return NextResponse.json({ month: thisMonth, candidates: candidates.length, drafted, skipped, failed })
  } catch (error) {
    console.error("[feed-plan monthly draft] run failed:", error)
    return NextResponse.json({ error: "run_failed" }, { status: 500 })
  }
}
