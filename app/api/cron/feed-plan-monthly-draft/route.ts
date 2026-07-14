// Feed Planner Phase 2c - monthly rollover. On the 1st, Maya drafts the new month for every
// member who was actually using the calendar (had a plan last month) so the first thing they
// see in a fresh month is a planned calendar, not an empty one. Members who never touched
// Calendar aren't drafted for here - their first Calendar open still triggers the draft lazily
// (app/feed-planner/feed-planner-client.tsx), same as before.
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

function previousPeriodMonth(period: string): string {
  const [year, month] = period.split("-").map(Number)
  const d = new Date(Date.UTC(year, month - 2, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

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
  const lastMonth = previousPeriodMonth(thisMonth)

  try {
    // Users who had an auto-drafted plan LAST month and nothing yet for THIS month. The
    // per-user lock + guard inside draftMonthPlanForUser make re-runs and races harmless.
    const candidates = await sql`
      SELECT DISTINCT fl.user_id, u.supabase_user_id, u.stack_auth_id
      FROM feed_layouts fl
      JOIN users u ON u.id = fl.user_id
      WHERE fl.period_month = ${lastMonth}
        AND NOT EXISTS (
          SELECT 1 FROM feed_layouts nxt
          WHERE nxt.user_id = fl.user_id AND nxt.period_month = ${thisMonth}
        )
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
