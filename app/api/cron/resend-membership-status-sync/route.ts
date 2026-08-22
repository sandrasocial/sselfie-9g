import { NextResponse } from "next/server"

import { createCronLogger } from "@/lib/cron-logger"
import { sql } from "@/lib/db/client"
import { updateContactTags } from "@/lib/resend/manage-contact"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const ROLLOUT_START = "2026-08-22T00:00:00Z"
const BATCH_LIMIT = 50
const PACE_MS = 120

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

type Candidate = {
  email: string
  product_type: string
  status: string
  source_updated_at: string
}

async function ensureSyncState(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS resend_membership_status_sync_state (
      email TEXT PRIMARY KEY,
      source_updated_at TIMESTAMPTZ,
      synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_error TEXT,
      failure_count INTEGER NOT NULL DEFAULT 0,
      retry_after TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    ALTER TABLE resend_membership_status_sync_state
    ADD COLUMN IF NOT EXISTS failure_count INTEGER NOT NULL DEFAULT 0
  `
  await sql`
    ALTER TABLE resend_membership_status_sync_state
    ADD COLUMN IF NOT EXISTS retry_after TIMESTAMPTZ
  `
}

async function getCandidates(): Promise<Candidate[]> {
  return (await sql`
    WITH membership_rows AS (
      SELECT
        LOWER(BTRIM(u.email)) AS email,
        s.product_type,
        s.status,
        s.updated_at,
        MAX(s.updated_at) OVER (PARTITION BY LOWER(BTRIM(u.email))) AS source_updated_at,
        ROW_NUMBER() OVER (
          PARTITION BY LOWER(BTRIM(u.email))
          ORDER BY
            CASE s.status
              WHEN 'active' THEN 1
              WHEN 'trialing' THEN 2
              WHEN 'past_due' THEN 3
              WHEN 'unpaid' THEN 4
              WHEN 'paused' THEN 5
              WHEN 'incomplete' THEN 6
              WHEN 'canceled' THEN 7
              WHEN 'cancelled' THEN 7
              WHEN 'incomplete_expired' THEN 8
              ELSE 9
            END,
            s.updated_at DESC NULLS LAST,
            s.created_at DESC
        ) AS status_rank
      FROM subscriptions s
      INNER JOIN users u ON u.id::varchar = s.user_id::varchar
      WHERE COALESCE(s.is_test_mode, FALSE) = FALSE
        AND s.product_type IN (
          'sselfie_studio_membership',
          'sselfie_studio_membership_annual',
          'brand_studio_membership',
          'pro'
        )
        AND u.email IS NOT NULL
        AND BTRIM(u.email) <> ''
        AND LOWER(BTRIM(u.email)) ~ '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$'
        AND (
          s.status IN ('active', 'trialing', 'past_due', 'unpaid', 'paused', 'incomplete')
          OR s.updated_at >= ${ROLLOUT_START}::timestamptz
        )
    ),
    current_truth AS (
      SELECT
        email,
        product_type,
        status,
        source_updated_at
      FROM membership_rows
      WHERE status_rank = 1
    )
    SELECT
      truth.email,
      truth.product_type,
      truth.status,
      truth.source_updated_at
    FROM current_truth truth
    LEFT JOIN resend_membership_status_sync_state sync ON sync.email = truth.email
    WHERE sync.email IS NULL
       OR sync.source_updated_at IS NULL
       OR truth.source_updated_at > sync.source_updated_at
       OR (
         sync.last_error IS NOT NULL
         AND (sync.retry_after IS NULL OR sync.retry_after <= NOW())
       )
    ORDER BY
      CASE
        -- Billing/cancellation changes on contacts we have already synced are the most
        -- time-sensitive state. Process them before draining untouched historical rows.
        WHEN sync.email IS NOT NULL
          AND sync.last_error IS NULL
          AND sync.source_updated_at IS NOT NULL
          AND truth.source_updated_at > sync.source_updated_at THEN 0
        -- Untouched contacts are the backfill queue.
        WHEN sync.email IS NULL THEN 1
        -- Failed/missing contacts are deliberately last and only become eligible after backoff.
        ELSE 2
      END,
      truth.source_updated_at DESC
    LIMIT ${BATCH_LIMIT}
  `) as Candidate[]
}

async function recordFailure(
  candidate: Candidate,
  error: string,
): Promise<void> {
  await sql`
    INSERT INTO resend_membership_status_sync_state (
      email, source_updated_at, synced_at, last_error, failure_count, retry_after, updated_at
    ) VALUES (
      ${candidate.email}, ${candidate.source_updated_at}, NOW(), ${error}, 1,
      NOW() + INTERVAL '24 hours', NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
      source_updated_at = EXCLUDED.source_updated_at,
      synced_at = NOW(),
      last_error = EXCLUDED.last_error,
      failure_count = resend_membership_status_sync_state.failure_count + 1,
      retry_after = NOW() + INTERVAL '24 hours',
      updated_at = NOW()
  `
}

export async function GET(request: Request) {
  const logger = createCronLogger("resend-membership-status-sync")
  await logger.start()

  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    const isProduction =
      process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
      await logger.error(new Error("Unauthorized"), { reason: "Invalid cron authorization" })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await ensureSyncState()
    const candidates = await getCandidates()
    const summary = {
      found: candidates.length,
      updated: 0,
      contactNotFound: 0,
      failed: 0,
      byStatus: candidates.reduce<Record<string, number>>((counts, candidate) => {
        counts[candidate.status] = (counts[candidate.status] || 0) + 1
        return counts
      }, {}),
    }

    for (const candidate of candidates) {
      const result = await updateContactTags(candidate.email, {
        lifecycle_stage: "member",
        membership_status: candidate.status,
        primary_interest: "all",
        last_product: candidate.product_type,
      })

      if (result.success) {
        summary.updated += 1
        await sql`
          INSERT INTO resend_membership_status_sync_state (
            email, source_updated_at, synced_at, last_error, failure_count, retry_after, updated_at
          ) VALUES (
            ${candidate.email}, ${candidate.source_updated_at}, NOW(), NULL, 0, NULL, NOW()
          )
          ON CONFLICT (email) DO UPDATE SET
            source_updated_at = EXCLUDED.source_updated_at,
            synced_at = NOW(),
            last_error = NULL,
            failure_count = 0,
            retry_after = NULL,
            updated_at = NOW()
        `
      } else if (String(result.error || '').toLowerCase().includes('not found')) {
        // Missing marketing contacts are not considered successfully synced, but they are
        // backed off for 24h so they cannot monopolize the newest 50 slots every hour.
        summary.contactNotFound += 1
        await recordFailure(candidate, "contact_not_found")
      } else {
        summary.failed += 1
        await recordFailure(candidate, result.error || "unknown")
      }

      await sleep(PACE_MS)
    }

    await logger.success(summary)
    return NextResponse.json({ success: true, ...summary })
  } catch (error: unknown) {
    await logger.error(error, { step: "resend-membership-status-sync" })
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Membership status sync failed",
      },
      { status: 500 },
    )
  }
}
