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

function toIso(value: unknown): string | null {
  if (!(value instanceof Date) && (typeof value !== "string" || value.length === 0)) {
    return null
  }
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
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
    accessEndsAt: null,
    billingKind: null,
    credits: null,
    creditsUnlimited,
    email: user.email ?? null,
  }

  try {
    const neonUserId = await getUserIdFromSupabase(user.id)
    if (!neonUserId) {
      return NextResponse.json({ error: "Account record not found" }, { status: 404 })
    }

    const enforceLiveMode = shouldEnforceLiveSubscriptionRows()
    const [credits, subs] = await Promise.all([
      getUserCredits(String(neonUserId)).catch(() => null),
      sql`
        SELECT plan, product_type, status, current_period_end, trial_ends_at
        FROM subscriptions
        WHERE user_id = ${String(neonUserId)}
          AND product_type IN (
            'sselfie_studio_membership',
            'selfie_visibility_bundle_pass',
            'selfie_visibility_bundle'
          )
          AND (${enforceLiveMode} = false OR COALESCE(is_test_mode, false) = false)
        ORDER BY created_at DESC
      `.catch(() => [] as Record<string, unknown>[]),
    ])

    const subscriptionRows = subs as Record<string, unknown>[]
    const recurringMembership = subscriptionRows.find(
      row => row.product_type === "sselfie_studio_membership" && row.status === "active",
    )
    const bundlePass = subscriptionRows.find(
      row => row.product_type === "selfie_visibility_bundle_pass",
    )
    const ownsBundle = subscriptionRows.some(
      row => row.product_type === "selfie_visibility_bundle",
    )
    const passEndsAt = toIso(bundlePass?.trial_ends_at)
    const passIsActive =
      bundlePass?.status === "active" &&
      passEndsAt !== null &&
      new Date(passEndsAt).getTime() > Date.now()

    if (recurringMembership) {
      return NextResponse.json({
        plan: planLabel(recurringMembership.plan ?? recurringMembership.product_type),
        status: "active",
        renewsAt: toIso(recurringMembership.current_period_end),
        accessEndsAt: null,
        billingKind: "recurring",
        credits,
        creditsUnlimited,
        email: user.email ?? null,
      })
    }

    if (passIsActive) {
      return NextResponse.json({
        plan: "One Selfie Visibility Bundle",
        status: "active",
        renewsAt: null,
        accessEndsAt: passEndsAt,
        billingKind: "fixed_pass",
        credits,
        creditsUnlimited,
        email: user.email ?? null,
      })
    }

    if (ownsBundle) {
      return NextResponse.json({
        plan: "One Selfie Visibility Bundle",
        status: "owned",
        renewsAt: null,
        accessEndsAt: passEndsAt,
        billingKind: "one_time",
        credits,
        creditsUnlimited,
        email: user.email ?? null,
      })
    }

    return NextResponse.json({
      ...empty,
      credits,
      creditsUnlimited,
    })
  } catch (e) {
    console.error("[app-v3 account] load failed:", e)
    // A successful-looking empty account creates a false upsell state. Let the client show
    // a retryable error instead of telling an active customer she has no membership.
    return NextResponse.json({ error: "Account details are temporarily unavailable" }, { status: 503 })
  }
}
