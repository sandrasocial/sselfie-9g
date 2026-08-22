import { NextResponse } from "next/server"

import { createCronLogger } from "@/lib/cron-logger"
import { sql } from "@/lib/db/client"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { addOrUpdateResendContact } from "@/lib/resend/manage-contact"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const BATCH_LIMIT = 100
const SEND_DELAY_MS = 120

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

type Candidate = {
  email: string
  name: string | null
  acquisition_path: string
  lifecycle_stage: "lead" | "customer" | "member"
  primary_interest: string
  membership_status: string
  last_product: string | null
  source_updated_at: string
}

async function ensureSyncStateTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS resend_lifecycle_sync_state (
      email TEXT PRIMARY KEY,
      source_updated_at TIMESTAMPTZ,
      synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_error TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
}

async function getCandidates(): Promise<Candidate[]> {
  return (await sql`
    WITH latest_freebie AS (
      SELECT DISTINCT ON (LOWER(BTRIM(fs.email)))
        LOWER(BTRIM(fs.email)) AS email,
        NULLIF(BTRIM(fs.name), '') AS name,
        COALESCE(NULLIF(BTRIM(fs.source), ''), 'unknown') AS source,
        COALESCE(fs.email_tags, ARRAY[]::text[]) AS email_tags,
        fs.created_at,
        fs.updated_at
      FROM freebie_subscribers fs
      WHERE fs.email IS NOT NULL
        AND BTRIM(fs.email) <> ''
      ORDER BY LOWER(BTRIM(fs.email)), fs.updated_at DESC NULLS LAST, fs.created_at DESC
    ),
    enriched AS (
      SELECT
        f.email,
        f.name,
        CASE
          WHEN f.source ILIKE '%selfie%guide%' OR f.source ILIKE '%freebie%selfie%' THEN 'selfie_guide'
          WHEN f.source ILIKE '%ai%prompt%' OR f.source ILIKE '%prompt%guide%' THEN 'ai_prompts'
          WHEN f.source ILIKE '%manychat%' THEN 'manychat'
          WHEN f.source ILIKE '%starter%kit%' THEN 'starter_kit'
          WHEN f.source ILIKE '%prompt%vault%' THEN 'prompt_vault'
          ELSE LOWER(REGEXP_REPLACE(f.source, '[^a-zA-Z0-9]+', '_', 'g'))
        END AS acquisition_path,
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM users u
            JOIN subscriptions s ON s.user_id = u.id::varchar
            WHERE LOWER(BTRIM(u.email)) = f.email
              AND s.product_type IN ('sselfie_studio_membership', 'sselfie_studio_membership_annual')
              AND s.status IN ('active', 'trialing')
              AND COALESCE(s.is_test_mode, FALSE) = FALSE
          ) THEN 'member'
          WHEN f.source IN ('starter-kit-paid', 'prompt-vault-paid')
            OR f.email_tags && ARRAY['purchased', 'customer', 'starter-kit-paid', 'prompt-vault-paid', 'bought_prompt_vault']::text[]
            OR EXISTS (
              SELECT 1
              FROM stripe_payments sp
              WHERE LOWER(BTRIM(sp.customer_email)) = f.email
                AND sp.status IN ('succeeded', 'paid')
                AND COALESCE(sp.is_test_mode, FALSE) = FALSE
            ) THEN 'customer'
          ELSE 'lead'
        END AS lifecycle_stage,
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM users u
            JOIN subscriptions s ON s.user_id = u.id::varchar
            WHERE LOWER(BTRIM(u.email)) = f.email
              AND s.product_type IN ('sselfie_studio_membership', 'sselfie_studio_membership_annual')
              AND s.status IN ('active', 'trialing')
              AND COALESCE(s.is_test_mode, FALSE) = FALSE
          ) THEN 'all'
          WHEN f.source ILIKE '%prompt%' OR f.email_tags::text ILIKE '%prompt%' THEN 'ai_photos'
          WHEN f.source ILIKE '%selfie%' OR f.email_tags::text ILIKE '%selfie%' THEN 'selfies'
          ELSE 'unknown'
        END AS primary_interest,
        COALESCE((
          SELECT s.status
          FROM users u
          JOIN subscriptions s ON s.user_id = u.id::varchar
          WHERE LOWER(BTRIM(u.email)) = f.email
            AND s.product_type IN ('sselfie_studio_membership', 'sselfie_studio_membership_annual')
            AND COALESCE(s.is_test_mode, FALSE) = FALSE
          ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC
          LIMIT 1
        ), 'none') AS membership_status,
        COALESCE((
          SELECT sp.product_type
          FROM stripe_payments sp
          WHERE LOWER(BTRIM(sp.customer_email)) = f.email
            AND sp.status IN ('succeeded', 'paid')
            AND COALESCE(sp.is_test_mode, FALSE) = FALSE
            AND sp.product_type IS NOT NULL
          ORDER BY sp.payment_date DESC NULLS LAST, sp.created_at DESC
          LIMIT 1
        ), CASE
          WHEN f.source = 'starter-kit-paid' THEN 'starter_kit'
          WHEN f.source = 'prompt-vault-paid' THEN 'prompt_vault'
          ELSE NULL
        END) AS last_product,
        GREATEST(
          COALESCE(f.updated_at, f.created_at),
          COALESCE((
            SELECT MAX(s.updated_at)
            FROM users u
            JOIN subscriptions s ON s.user_id = u.id::varchar
            WHERE LOWER(BTRIM(u.email)) = f.email
              AND COALESCE(s.is_test_mode, FALSE) = FALSE
          ), '-infinity'::timestamptz),
          COALESCE((
            SELECT MAX(COALESCE(sp.updated_at, sp.payment_date, sp.created_at))
            FROM stripe_payments sp
            WHERE LOWER(BTRIM(sp.customer_email)) = f.email
              AND COALESCE(sp.is_test_mode, FALSE) = FALSE
          ), '-infinity'::timestamptz)
        ) AS source_updated_at
      FROM latest_freebie f
    )
    SELECT
      e.email,
      e.name,
      e.acquisition_path,
      e.lifecycle_stage,
      e.primary_interest,
      e.membership_status,
      e.last_product,
      e.source_updated_at
    FROM enriched e
    LEFT JOIN resend_lifecycle_sync_state sync ON sync.email = e.email
    WHERE sync.email IS NULL
       OR sync.source_updated_at IS NULL
       OR e.source_updated_at > sync.source_updated_at
    ORDER BY e.source_updated_at ASC
    LIMIT ${BATCH_LIMIT}
  `) as Candidate[]
}

export async function GET(request: Request) {
  const logger = createCronLogger("resend-lifecycle-sync")
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

    await ensureSyncStateTable()
    const dryRun = new URL(request.url).searchParams.get("dry_run") === "1"
    const candidates = await getCandidates()
    const summary = {
      dryRun,
      found: candidates.length,
      leads: candidates.filter(candidate => candidate.lifecycle_stage === "lead").length,
      customers: candidates.filter(candidate => candidate.lifecycle_stage === "customer").length,
      members: candidates.filter(candidate => candidate.lifecycle_stage === "member").length,
      synced: 0,
      failed: 0,
    }

    if (dryRun) {
      await logger.success(summary)
      return NextResponse.json({ success: true, ...summary })
    }

    for (const candidate of candidates) {
      const firstName = getFirstNameForEmail({
        fullName: candidate.name,
        email: candidate.email,
      })

      const result = await addOrUpdateResendContact(candidate.email, firstName, {
        acquisition_path: candidate.acquisition_path,
        lifecycle_stage: candidate.lifecycle_stage,
        primary_interest: candidate.primary_interest,
        membership_status: candidate.membership_status,
        last_product: candidate.last_product || undefined,
      })

      if (result.success) {
        summary.synced += 1
        await sql`
          INSERT INTO resend_lifecycle_sync_state (
            email, source_updated_at, synced_at, last_error, updated_at
          ) VALUES (
            ${candidate.email}, ${candidate.source_updated_at}, NOW(), NULL, NOW()
          )
          ON CONFLICT (email) DO UPDATE SET
            source_updated_at = EXCLUDED.source_updated_at,
            synced_at = NOW(),
            last_error = NULL,
            updated_at = NOW()
        `
      } else {
        summary.failed += 1
        await sql`
          INSERT INTO resend_lifecycle_sync_state (
            email, source_updated_at, synced_at, last_error, updated_at
          ) VALUES (
            ${candidate.email}, NULL, NOW(), ${result.error || 'unknown'}, NOW()
          )
          ON CONFLICT (email) DO UPDATE SET
            last_error = EXCLUDED.last_error,
            synced_at = NOW(),
            updated_at = NOW()
        `
      }

      await sleep(SEND_DELAY_MS)
    }

    await logger.success(summary)
    return NextResponse.json({ success: true, ...summary })
  } catch (error: unknown) {
    await logger.error(error, { step: "resend-lifecycle-sync" })
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Resend lifecycle sync failed",
      },
      { status: 500 },
    )
  }
}
