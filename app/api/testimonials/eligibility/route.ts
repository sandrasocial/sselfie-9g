import { NextRequest, NextResponse } from "next/server"

import { logAnalyticsEvent } from "@/lib/analytics/events"
import { sql } from "@/lib/db/client"
import { createServerClient } from "@/lib/supabase/server"
import {
  evaluateSuiteReviewEligibility,
  safeReviewContextValue,
  SUITE_REVIEW_DISMISSAL_COOLDOWN_DAYS,
  SUITE_REVIEW_PLATFORM,
  SUITE_REVIEW_PRODUCT,
  SUITE_REVIEW_PROMPT_COOLDOWN_DAYS,
} from "@/lib/testimonials/review-contract"
import { getUserByAuthId } from "@/lib/user-mapping"

type EligibilityAction = "download" | "dismiss"

async function getAuthenticatedReviewUser() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null
  const neonUser = await getUserByAuthId(user.id)
  if (!neonUser?.id || !neonUser.email) return null

  return neonUser
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedReviewUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const action = body?.action as EligibilityAction | undefined
    if (action !== "download" && action !== "dismiss") {
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 })
    }

    const userId = String(currentUser.id)
    const source = safeReviewContextValue(body?.source) || "app-v3"
    const format = safeReviewContextValue(body?.format)
    const assetId = safeReviewContextValue(body?.assetId, 128)

    if (action === "dismiss") {
      await logAnalyticsEvent({
        eventName: "suite_review_prompt_dismissed",
        userId,
        path: "/app",
        properties: { source },
      })
      return NextResponse.json({ eligible: false, reason: "recently_dismissed" })
    }

    await logAnalyticsEvent({
      eventName: "suite_image_downloaded",
      userId,
      path: "/app",
      properties: {
        source,
        ...(format ? { format } : {}),
        ...(assetId ? { asset_id: assetId } : {}),
      },
    })

    const rows = await sql`
      SELECT
        (
          SELECT COUNT(*)::int
          FROM analytics_events
          WHERE user_id = ${userId}
            AND event_name = 'suite_image_downloaded'
        ) AS download_count,
        EXISTS (
          SELECT 1
          FROM admin_testimonials
          WHERE (
            key_benefits->>'source_user_id' = ${userId}
            OR LOWER(customer_email) = LOWER(${currentUser.email})
          )
            AND platform = ${SUITE_REVIEW_PLATFORM}
            AND product_mentioned = ${SUITE_REVIEW_PRODUCT}
        ) AS prior_submission,
        EXISTS (
          SELECT 1
          FROM analytics_events
          WHERE user_id = ${userId}
            AND event_name = 'suite_review_prompt_dismissed'
            AND created_at > NOW() - (${`${SUITE_REVIEW_DISMISSAL_COOLDOWN_DAYS} days`}::interval)
        ) AS recent_dismissal,
        EXISTS (
          SELECT 1
          FROM analytics_events
          WHERE user_id = ${userId}
            AND event_name = 'suite_review_prompt_shown'
            AND created_at > NOW() - (${`${SUITE_REVIEW_PROMPT_COOLDOWN_DAYS} days`}::interval)
        ) AS recent_prompt
    `

    const eligibility = evaluateSuiteReviewEligibility(rows[0] || {})
    if (eligibility.eligible) {
      await logAnalyticsEvent({
        eventName: "suite_review_prompt_shown",
        userId,
        path: "/app",
        properties: { source, download_count: eligibility.downloadCount },
      })
    }

    return NextResponse.json(eligibility)
  } catch (error) {
    console.error("[suite-review] eligibility failed:", error)
    // Review capture must never interrupt the successful download.
    return NextResponse.json({ eligible: false, reason: "unavailable" })
  }
}
