import { sql } from "@/lib/db/client"
import { queueAllImagesForFeed } from "@/lib/feed-planner/queue-images"
import { currentPeriodMonth } from "@/lib/feed-planner/write-auto-draft"

export const DEFAULT_WEEKLY_CAP = 10
const DEFAULT_RUN_CAP = 10

export function deliveredMonthEnabled(value?: string): boolean {
  if (value !== undefined) return value === "true"
  return process.env.CALENDAR_DELIVERED_MONTH_ENABLED === "true"
}

export function parseCalendarPregenWeeklyCap(value = process.env.CALENDAR_PREGEN_WEEKLY_CAP): number {
  const parsed = Number.parseInt(value || "", 10)
  if (!Number.isFinite(parsed)) return DEFAULT_WEEKLY_CAP
  return Math.max(1, Math.min(31, parsed))
}

export function remainingWeeklyPregenAllowance(cap: number, used: number): number {
  return Math.max(0, cap - Math.max(0, used))
}

function parseRunCap(value = process.env.CALENDAR_PREGEN_RUN_CAP): number {
  const parsed = Number.parseInt(value || "", 10)
  if (!Number.isFinite(parsed)) return DEFAULT_RUN_CAP
  return Math.max(1, Math.min(20, parsed))
}

type EligibleLayout = {
  feed_layout_id: number
  user_id: number
  supabase_user_id: string | null
  stack_auth_id: string | null
  weekly_used: number
}

export async function hasDeliveredMonthAccess(userId: number | string): Promise<boolean> {
  const [row] = await sql`
    SELECT EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = ${userId}
        AND (
          u.role = 'admin'
          OR EXISTS (
            SELECT 1
            FROM subscriptions s
            WHERE s.user_id = u.id
              AND COALESCE(s.is_test_mode, FALSE) = FALSE
              AND (
                (
                  s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro')
                  AND (
                    s.status IN ('active', 'trialing')
                    OR (s.status IN ('canceled', 'cancelled', 'past_due') AND s.current_period_end > NOW())
                  )
                )
                OR (
                  s.product_type = 'selfie_visibility_bundle_pass'
                  AND s.status = 'active'
                  AND s.trial_ends_at > NOW()
                )
              )
          )
        )
    ) AS allowed
  `
  return row?.allowed === true
}

/**
 * Keeps the next seven days of person-led calendar posts ready for active members.
 * The existing queue owns atomic claims, provider calls, and abandoned-claim recovery.
 * This coordinator only narrows eligible rows and explicitly makes the business pay.
 */
export async function runDeliveredMonthTopUp(): Promise<{
  enabled: boolean
  layouts: number
  queued: number
  failed: number
}> {
  if (!deliveredMonthEnabled()) {
    return { enabled: false, layouts: 0, queued: 0, failed: 0 }
  }

  const periodMonth = currentPeriodMonth()
  const weeklyCap = parseCalendarPregenWeeklyCap()
  let remainingRunCapacity = parseRunCap()

  // Admin is included so Sandra can validate the dark release on her own account. Everyone
  // else must hold current membership access or the paid fixed 30-day bundle pass.
  const layouts = (await sql`
    SELECT
      fl.id AS feed_layout_id,
      u.id AS user_id,
      u.supabase_user_id,
      u.stack_auth_id,
      COUNT(done.id)::int AS weekly_used
    FROM feed_layouts fl
    JOIN users u ON u.id = fl.user_id
    LEFT JOIN feed_posts done
      ON done.user_id = u.id
      AND done.pregenerated = TRUE
      AND done.pregenerated_at >= date_trunc('week', NOW())
    WHERE fl.period_month = ${periodMonth}
      AND (
        u.role = 'admin'
        OR EXISTS (
          SELECT 1
          FROM subscriptions s
          WHERE s.user_id = u.id
            AND COALESCE(s.is_test_mode, FALSE) = FALSE
            AND (
              (
                s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro')
                AND (
                  s.status IN ('active', 'trialing')
                  OR (s.status IN ('canceled', 'cancelled', 'past_due') AND s.current_period_end > NOW())
                )
              )
              OR (
                s.product_type = 'selfie_visibility_bundle_pass'
                AND s.status = 'active'
                AND s.trial_ends_at > NOW()
              )
            )
        )
      )
      AND EXISTS (
        SELECT 1
        FROM user_avatar_images uai
        WHERE uai.user_id = u.id
          AND uai.is_active = TRUE
          AND uai.image_type IN ('selfie', 'side-profile', 'three-quarter', 'full-body')
      )
      AND EXISTS (
        SELECT 1
        FROM feed_posts pending
        WHERE pending.feed_layout_id = fl.id
          AND pending.user_id = u.id
          AND pending.post_type = 'selfie'
          AND pending.scheduled_at::date >= CURRENT_DATE
          AND pending.scheduled_at::date < CURRENT_DATE + 7
          AND pending.image_url IS NULL
          AND pending.prediction_id IS NULL
          AND (pending.generation_status IS NULL OR pending.generation_status IN ('pending', 'failed'))
      )
    GROUP BY fl.id, u.id, u.supabase_user_id, u.stack_auth_id
    ORDER BY COUNT(done.id) ASC, u.id ASC
    LIMIT 50
  `) as EligibleLayout[]

  let queued = 0
  let failed = 0
  let attemptedLayouts = 0

  for (const layout of layouts) {
    if (remainingRunCapacity <= 0) break
    const authUserId = layout.supabase_user_id || layout.stack_auth_id
    if (!authUserId) continue

    const allowance = Math.min(
      remainingWeeklyPregenAllowance(weeklyCap, Number(layout.weekly_used) || 0),
      remainingRunCapacity,
    )
    if (allowance <= 0) continue

    const targets = await sql`
      SELECT id
      FROM feed_posts
      WHERE feed_layout_id = ${layout.feed_layout_id}
        AND user_id = ${layout.user_id}
        AND post_type = 'selfie'
        AND scheduled_at::date >= CURRENT_DATE
        AND scheduled_at::date < CURRENT_DATE + 7
        AND image_url IS NULL
        AND prediction_id IS NULL
        AND (generation_status IS NULL OR generation_status IN ('pending', 'failed'))
      ORDER BY scheduled_at ASC, position ASC
      LIMIT ${allowance}
    `
    const postIds = targets.map((row) => Number(row.id)).filter(Number.isInteger)
    if (postIds.length === 0) continue

    attemptedLayouts += 1
    try {
      const result = await queueAllImagesForFeed(
        Number(layout.feed_layout_id),
        authUserId,
        process.env.NEXT_PUBLIC_APP_URL || "https://sselfie.ai",
        undefined,
        undefined,
        {
          postIds,
          chargeCredits: false,
          markPregenerated: true,
          forceProMode: true,
          identityReferencesOnly: true,
          useCuratedFeedStylePrompts: true,
        },
      )
      queued += Number(result.queuedCount) || 0
      failed += Number(result.failedCount) || 0
      remainingRunCapacity -= postIds.length
    } catch (error) {
      failed += postIds.length
      remainingRunCapacity -= postIds.length
      console.error(`[calendar delivered month] layout ${layout.feed_layout_id} failed:`, error)
    }
  }

  console.log(
    `[calendar delivered month] period=${periodMonth} layouts=${attemptedLayouts} queued=${queued} failed=${failed}`,
  )
  return { enabled: true, layouts: attemptedLayouts, queued, failed }
}
