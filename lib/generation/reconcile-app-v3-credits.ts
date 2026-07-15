import "server-only"

import { getDb } from "@/lib/db/client"
import { CREDIT_COSTS, refundCredits } from "@/lib/credits"
import { acquireKvLock, releaseKvLock } from "@/lib/cache"

/**
 * CREDIT-INTEGRITY-01: settle app-v3 generation charges against what actually reached the
 * member's gallery.
 *
 * Every app-v3 generation charge carries a `reference_id` of the form
 * `app-v3-gen-<userId>-<ts>`, and every image that run persists carries a matching
 * `prediction_id` prefix (`<ref>-<index>`). In-request refunds reuse the same ref (or a
 * `<ref>-partial` suffix). So for any settled charge:
 *
 *   charged credits === delivered gallery images + refunded credits
 *
 * When that doesn't hold after `minAgeMinutes`, the run died somewhere no in-request catch
 * could refund it: Vercel killed the function at maxDuration, the process crashed after the
 * deduction, or the refund write itself failed. This job returns the shortfall so a member is
 * never left paying for photos she never got.
 */
export async function reconcileAppV3GenerationCredits(input?: {
  limit?: number
  minAgeMinutes?: number
  maxAgeHours?: number
  lockTtlMs?: number
}): Promise<{
  locked: boolean
  scanned: number
  refundedCharges: number
  refundedCredits: number
  errors: number
}> {
  const limit = input?.limit ?? 50
  const minAgeMinutes = input?.minAgeMinutes ?? 15
  const maxAgeHours = input?.maxAgeHours ?? 48
  const lockTtlMs = input?.lockTtlMs ?? 240_000

  const lock = await acquireKvLock({
    key: "lock:generation:reconcile:app-v3-credits",
    ttlMs: lockTtlMs,
  })
  if (!lock.acquired) {
    return { locked: false, scanned: 0, refundedCharges: 0, refundedCredits: 0, errors: 0 }
  }

  const sql = getDb()
  let scanned = 0
  let refundedCharges = 0
  let refundedCredits = 0
  let errors = 0

  try {
    const openCharges = (await sql`
      WITH generation_charges AS (
        SELECT
          ct.user_id,
          ct.reference_id,
          ct.created_at,
          (-ct.amount)::int AS charged,
          (
            SELECT COUNT(*)::int
            FROM ai_images ai
            WHERE ai.user_id = ct.user_id
              AND (
                ai.prediction_id LIKE ct.reference_id || '-%'
                OR ai.prediction_id = ct.reference_id
              )
          ) AS delivered,
          COALESCE(
            (
              SELECT SUM(r.amount)::int
              FROM credit_transactions r
              WHERE r.user_id = ct.user_id
                AND r.transaction_type = 'refund'
                AND (
                  r.reference_id = ct.reference_id
                  OR r.reference_id LIKE ct.reference_id || '-%'
                )
            ),
            0
          ) AS refunded
        FROM credit_transactions ct
        WHERE ct.transaction_type = 'image'
          AND (
            ct.reference_id LIKE 'app-v3-gen-%'
            OR ct.reference_id LIKE 'app-v3-custom-model-%'
          )
          AND ct.created_at < NOW() - (${minAgeMinutes} * INTERVAL '1 minute')
          AND ct.created_at > NOW() - (${maxAgeHours} * INTERVAL '1 hour')

        UNION ALL

        SELECT
          ct.user_id,
          ct.reference_id,
          ct.created_at,
          (-ct.amount)::int AS charged,
          (
            SELECT COUNT(*)::int * ${CREDIT_COSTS.ANIMATION}
            FROM generated_videos v
            WHERE v.user_id = ct.user_id
              AND v.credit_reference_id = ct.reference_id
              AND v.status = 'completed'
              AND v.video_url IS NOT NULL
          ) AS delivered,
          COALESCE(
            (
              SELECT SUM(r.amount)::int
              FROM credit_transactions r
              WHERE r.user_id = ct.user_id
                AND r.transaction_type = 'refund'
                AND (
                  r.reference_id = ct.reference_id
                  OR r.reference_id LIKE ct.reference_id || '-%'
                )
            ),
            0
          ) AS refunded
        FROM credit_transactions ct
        WHERE ct.transaction_type = 'animation'
          AND ct.reference_id LIKE 'app-v3-video-%'
          AND ct.created_at < NOW() - (${minAgeMinutes} * INTERVAL '1 minute')
          AND ct.created_at > NOW() - (${maxAgeHours} * INTERVAL '1 hour')
      )
      SELECT user_id, reference_id, charged, delivered, refunded
      FROM generation_charges
      WHERE charged > delivered + refunded
      ORDER BY created_at ASC
      LIMIT ${limit}
    `) as Array<{
      user_id: string
      reference_id: string
      charged: number
      delivered: number
      refunded: number
    }>

    scanned = openCharges.length

    for (const charge of openCharges) {
      const shortfall = charge.charged - charge.delivered - charge.refunded
      if (shortfall <= 0) continue
      try {
        const result = await refundCredits(
          charge.user_id,
          shortfall,
          `Credits returned: ${shortfall} of ${charge.charged} images never arrived`,
          `${charge.reference_id}-reconcile`
        )
        if (result.success && result.refunded) {
          refundedCharges += 1
          refundedCredits += shortfall
          console.log(
            `[reconcile-app-v3-credits] returned ${shortfall} credits to ${charge.user_id} (${charge.reference_id})`
          )
        } else if (!result.success) {
          errors += 1
          console.error(
            `[reconcile-app-v3-credits] refund failed for ${charge.reference_id}: ${result.error}`
          )
        }
      } catch (error) {
        errors += 1
        console.error(`[reconcile-app-v3-credits] refund threw for ${charge.reference_id}:`, error)
      }
    }
  } finally {
    await releaseKvLock({
      key: "lock:generation:reconcile:app-v3-credits",
      value: lock.value,
    }).catch(() => {})
  }

  return { locked: true, scanned, refundedCharges, refundedCredits, errors }
}
