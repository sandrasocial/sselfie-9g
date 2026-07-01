// SSELFIE Studio 3.0 - native Account data (isolated /app endpoint, MAYA-REBUILD-15 / QA P0-3).
// One read for the Account tab: membership (plan, status, renewal), credit balance, email.
// Reuses the existing credit + subscription sources; nothing here writes.

import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserIdFromSupabase } from "@/lib/user-mapping"
import { sql } from "@/lib/db/client"
import { getUserCredits } from "@/lib/credits"
import { shouldEnforceLiveSubscriptionRows } from "@/lib/subscription"
import { isAdminEmail } from "@/lib/admin-feature-flags"

export const dynamic = "force-dynamic"

/** Member-facing plan label for a subscriptions.plan / product_type value. */
function planLabel(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.trim().length === 0) return null
  const key = raw.trim().toLowerCase()
  if (key === "sselfie_studio_membership") return "SSELFIE SUITE"
  if (key === "paid_blueprint") return "Feed Planner Blueprint"
  // Fallback: humanize the raw value rather than leaking snake_case.
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

export async function GET() {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const creditsUnlimited = isAdminEmail(user.email)
  const empty = {
    plan: null,
    status: null,
    renewsAt: null,
    credits: null,
    creditsUnlimited,
    email: user.email ?? null,
  }

  try {
    const neonUserId = await getUserIdFromSupabase(user.id)
    if (!neonUserId) return NextResponse.json(empty)

    const enforceLiveMode = shouldEnforceLiveSubscriptionRows()
    const [credits, subs] = await Promise.all([
      getUserCredits(String(neonUserId)).catch(() => null),
      sql`
        SELECT plan, product_type, status, current_period_end
        FROM subscriptions
        WHERE user_id = ${String(neonUserId)}
          AND status = 'active'
          AND (${enforceLiveMode} = false OR COALESCE(is_test_mode, false) = false)
        ORDER BY created_at DESC
        LIMIT 1
      `.catch(() => [] as Record<string, unknown>[]),
    ])

    const sub = (subs as Record<string, unknown>[])[0] ?? null
    const periodEnd = sub?.current_period_end
    return NextResponse.json({
      plan: planLabel(sub?.plan ?? sub?.product_type ?? null),
      status: typeof sub?.status === "string" ? sub.status : null,
      renewsAt:
        periodEnd instanceof Date
          ? periodEnd.toISOString()
          : typeof periodEnd === "string" && periodEnd.length > 0
            ? new Date(periodEnd).toISOString()
            : null,
      credits,
      creditsUnlimited,
      email: user.email ?? null,
    })
  } catch (e) {
    console.error("[app-v3 account] load failed:", e)
    // Never hard-fail the Account tab; render what we can.
    return NextResponse.json(empty)
  }
}
