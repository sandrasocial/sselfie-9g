/**
 * Aggregate-only, read-only audit for the private Your AI Content Team audience.
 *
 * Usage:
 *   pnpm revenue:work-with-me-audience
 *   pnpm revenue:work-with-me-audience -- --as-of 2026-08-18T12:00:00.000Z
 *
 * The script never creates a segment, sends a message, changes a pipeline record,
 * or prints an identity. Exact identities are rebuilt immediately before an approved send.
 */

/* eslint-disable no-console -- this CLI prints aggregate evidence only. */

import { createHash } from "node:crypto"
import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { Resend } from "resend"

import {
  WORK_WITH_ME_PRIVATE_AUDIENCE,
  classifyWorkWithMeAudience,
  scoreWorkWithMeCandidate,
  type WorkWithMeAudienceCandidate,
} from "../lib/work-with-me/audience"

dotenv.config({ path: process.env.SSELFIE_ENV_PATH || ".env.local" })

function arg(name: string) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] || null : null
}

function requiredEnv(name: string) {
  const value = String(process.env[name] || "").trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

function normalizeEmail(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
}

const CONTACT_BATCH_SIZE = 4
const CONTACT_BATCH_WINDOW_MS = 1_050
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function getContact(resend: Resend, audienceId: string, email: string) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const response = await resend.contacts.get({ audienceId, email })
    if (!response.error) return response.data || null
    const message = String(response.error.message || "")
    if (/not found|404/i.test(message)) return null
    if (!/429|rate|too many/i.test(message) || attempt === 6) {
      throw new Error("Could not audit current Resend contact state")
    }
    await sleep(Math.min(10_000, 800 * 2 ** (attempt - 1)))
  }
  return null
}

async function main() {
  const asOf = new Date(arg("--as-of") || new Date().toISOString())
  if (!Number.isFinite(asOf.getTime())) throw new Error("--as-of must be a valid ISO timestamp")

  const sql = neon(requiredEnv("DATABASE_URL"))
  const resend = new Resend(requiredEnv("RESEND_API_KEY"))
  const audienceId = requiredEnv("RESEND_AUDIENCE_ID")

  const [candidateRows, statusRows, testRows] = await Promise.all([
    sql`
      SELECT
        u.id AS user_id,
        LOWER(BTRIM(u.email)) AS email,
        COALESCE(payments.payment_count, 0)::int AS payment_count,
        COALESCE(payments.paid_cents, 0)::int AS paid_cents,
        payments.last_purchase_at::text AS last_purchase_at,
        EXISTS (
          SELECT 1 FROM subscriptions s
          WHERE s.user_id::text = u.id::text
            AND s.status IN ('active', 'trialing')
            AND COALESCE(s.is_test_mode, FALSE) = FALSE
        ) AS active_member,
        COALESCE(activity.event_count, 0) > 0 AS active_90d,
        COALESCE(activity.used_ai_content, FALSE) AS used_ai_content,
        NULLIF(BTRIM(up.website_url), '') IS NOT NULL
          OR NULLIF(BTRIM(up.instagram_handle), '') IS NOT NULL AS public_business,
        LENGTH(BTRIM(COALESCE(upb.target_audience, ''))) >= 12 AS audience_defined,
        LOWER(CONCAT_WS(' ', upb.business_type, upb.current_situation, upb.business_goals,
          upb.target_audience, upb.ideal_audience, upb.audience_challenge)) ~
          '(client|customer|service|coach|consult|business|salon|studio|shop|course|program|agency|photograph|design|therap|realt|estate)'
          AS existing_business_signal,
        LOWER(CONCAT_WS(' ', upb.current_situation, upb.business_goals, upb.content_goals,
          upb.photo_goals, upb.audience_challenge)) ~
          '(content|post|posting|instagram|social media|marketing|visible|visibility|consistent|overwhelm|time|plan|write|caption)'
          AS marketing_burden_signal,
        EXISTS (
          SELECT 1 FROM brand_engine_applications application
          WHERE LOWER(BTRIM(application.email)) = LOWER(BTRIM(u.email))
            AND (
              application.offer_type = 'work_with_me'
              OR application.source_channel IN ('work_with_me', 'work-with-me')
              OR application.lead_tags ? 'work-with-me'
            )
            AND application.pipeline_stage NOT IN ('closed_won', 'closed_lost', 'nurture')
        ) AS has_open_work_with_me_application
      FROM users u
      JOIN user_personal_brand upb ON upb.user_id::text = u.id::text
      LEFT JOIN user_profiles up ON up.user_id::text = u.id::text
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS payment_count,
          SUM(sp.amount_cents)::int AS paid_cents,
          MAX(sp.payment_date) AS last_purchase_at
        FROM stripe_payments sp
        WHERE sp.status IN ('succeeded', 'paid')
          AND COALESCE(sp.is_test_mode, FALSE) = FALSE
          AND sp.amount_cents > 0
          AND (sp.user_id::text = u.id::text OR LOWER(BTRIM(sp.customer_email)) = LOWER(BTRIM(u.email)))
          AND COALESCE(sp.product_type, '') <> 'work_with_me'
      ) payments ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS event_count,
          BOOL_OR(ae.event_name ILIKE '%maya%' OR ae.event_name ILIKE '%caption%'
            OR ae.event_name ILIKE '%content%' OR ae.event_name ILIKE '%feed%') AS used_ai_content
        FROM analytics_events ae
        WHERE ae.user_id::text = u.id::text
          AND ae.created_at >= ${new Date(asOf.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()}
      ) activity ON TRUE
      WHERE NULLIF(BTRIM(u.email), '') IS NOT NULL
        AND LOWER(u.email) NOT LIKE '%test%'
        AND LOWER(u.email) NOT LIKE '%example%'
        AND LOWER(u.email) NOT LIKE '%sselfie%'
        AND LENGTH(BTRIM(COALESCE(upb.business_type, ''))) >= 4
        AND COALESCE(payments.payment_count, 0) > 0
    `,
    sql`
      SELECT DISTINCT ON (LOWER(BTRIM(user_email)))
        LOWER(BTRIM(user_email)) AS email,
        status,
        MAX(COALESCE(sent_at, created_at)) OVER (PARTITION BY LOWER(BTRIM(user_email)))::text
          AS last_delivery_at
      FROM email_logs
      WHERE user_email IS NOT NULL
      ORDER BY LOWER(BTRIM(user_email)), COALESCE(sent_at, created_at) DESC, created_at DESC
    `,
    sql`
      SELECT DISTINCT LOWER(BTRIM(email)) AS email
      FROM freebie_subscribers
      WHERE email IS NOT NULL
        AND (source = 'funnel-test' OR source LIKE 'codex-%')
    `,
  ])

  const statuses = new Map(
    (statusRows as Array<{ email?: string; status?: string; last_delivery_at?: string }>).map(
      row => [
        normalizeEmail(row.email),
        { status: row.status || null, lastDeliveryAt: row.last_delivery_at || null },
      ]
    )
  )
  const testEmails = new Set(
    (testRows as Array<{ email?: string }>).map(row => normalizeEmail(row.email))
  )
  const provisional = (candidateRows as Array<Record<string, unknown>>)
    .map(row => {
      const email = normalizeEmail(row.email)
      const candidate: WorkWithMeAudienceCandidate = {
        userId: String(row.user_id || ""),
        email,
        hasPaid: Number(row.payment_count || 0) > 0,
        repeatBuyerOrHighValue:
          Number(row.payment_count || 0) >= 2 || Number(row.paid_cents || 0) >= 9_700,
        active90d: Boolean(row.active_90d),
        activeMember: Boolean(row.active_member),
        existingBusinessSignal: Boolean(row.existing_business_signal),
        marketingBurdenSignal: Boolean(row.marketing_burden_signal),
        audienceDefined: Boolean(row.audience_defined),
        publicBusiness: Boolean(row.public_business),
        usedAiContent: Boolean(row.used_ai_content),
        marketingPermissionKnown: false,
        lastPurchaseAt: row.last_purchase_at ? String(row.last_purchase_at) : null,
        latestDeliveryStatus: statuses.get(email)?.status || null,
        lastMarketingDeliveryAt: statuses.get(email)?.lastDeliveryAt || null,
        isMarketingTestOrInternal: email.endsWith("@sselfie.ai") || testEmails.has(email),
        hasOpenWorkWithMeApplication: Boolean(row.has_open_work_with_me_application),
      }
      return candidate
    })
    .filter(
      candidate =>
        candidate.existingBusinessSignal &&
        candidate.marketingBurdenSignal &&
        scoreWorkWithMeCandidate(candidate) >= WORK_WITH_ME_PRIVATE_AUDIENCE.minFitScore
    )

  const contactsByEmail = new Map<string, Awaited<ReturnType<typeof getContact>>>()
  for (let offset = 0; offset < provisional.length; offset += CONTACT_BATCH_SIZE) {
    const startedAt = Date.now()
    const batch = provisional.slice(offset, offset + CONTACT_BATCH_SIZE)
    const contacts = await Promise.all(
      batch.map(candidate => getContact(resend, audienceId, candidate.email))
    )
    batch.forEach((candidate, index) =>
      contactsByEmail.set(candidate.email, contacts[index] || null)
    )
    const elapsed = Date.now() - startedAt
    if (offset + batch.length < provisional.length && elapsed < CONTACT_BATCH_WINDOW_MS) {
      await sleep(CONTACT_BATCH_WINDOW_MS - elapsed)
    }
  }

  const candidates = provisional.map(candidate => {
    const contact = contactsByEmail.get(candidate.email)
    return {
      ...candidate,
      marketingPermissionKnown: Boolean(contact),
      unsubscribed: contact?.unsubscribed,
    }
  })
  const result = classifyWorkWithMeAudience({ candidates, now: asOf })
  const cohortFingerprint = createHash("sha256")
    .update("your_ai_content_team_private_audience_2026_08")
    .update("\n")
    .update(
      result.eligible
        .map(candidate => candidate.email)
        .sort()
        .join("\n")
    )
    .digest("hex")

  console.log(
    JSON.stringify(
      {
        generatedAt: asOf.toISOString(),
        status: WORK_WITH_ME_PRIVATE_AUDIENCE.status,
        firstPaidGate: WORK_WITH_ME_PRIVATE_AUDIENCE.firstPaidGate,
        totalFoundingPlaces: WORK_WITH_ME_PRIVATE_AUDIENCE.totalFoundingPlaces,
        scoredProblemFitCount: provisional.length,
        invitationEligibleCount: result.eligible.length,
        excluded: result.excluded,
        cohortFingerprint,
        identitiesPrinted: false,
        mutationsPerformed: false,
        salesQualificationRequired: true,
        nextBoundary:
          "Rebuild immediately before Sandra approves the exact private invitation send.",
      },
      null,
      2
    )
  )
}

main().catch(error => {
  console.error(
    `[work-with-me-audience-audit] ${error instanceof Error ? error.message : "Audit failed"}`
  )
  process.exitCode = 1
})
