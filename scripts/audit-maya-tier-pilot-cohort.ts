/**
 * Aggregate-only, read-only cohort audit for the private Maya two-price pilot.
 *
 * Usage:
 *   pnpm exec tsx scripts/audit-maya-tier-pilot-cohort.ts
 *   pnpm exec tsx scripts/audit-maya-tier-pilot-cohort.ts --as-of 2026-08-20T09:00:00.000Z
 *
 * The script never creates a segment, sends a message, changes access, or prints an identity.
 * The exact cohort must be rebuilt immediately before Sandra approves an invitation.
 */

/* eslint-disable no-console -- this CLI prints aggregate evidence only. */

import { createHash } from "node:crypto"
import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { Resend } from "resend"

import {
  MAYA_TIER_PILOT,
  classifyMayaTierPilotAudience,
  type MayaTierPilotCandidate,
} from "../lib/business/maya-tier-pilot"

dotenv.config({ path: process.env.SSELFIE_ENV_PATH || ".env.local" })

function arg(name: string): string | null {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] || null : null
}

function requiredEnv(name: string): string {
  const value = String(process.env[name] || "").trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

function normalizeEmail(value: unknown): string {
  return String(value || "").trim().toLowerCase()
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
  const [buyerRows, protectedRows, statusRows, deliveryRows, testRows] = await Promise.all([
    sql`
      SELECT
        LOWER(BTRIM(COALESCE(sp.customer_email, u.email))) AS email,
        MAX(sp.payment_date)::text AS last_purchase_at
      FROM stripe_payments sp
      LEFT JOIN users u ON u.id::text = sp.user_id::text
      WHERE sp.status IN ('succeeded', 'paid')
        AND COALESCE(sp.is_test_mode, FALSE) = FALSE
        AND sp.amount_cents > 0
        AND sp.product_type IN (
          'prompt_vault', 'starter_kit', 'presets_single', 'presets_bundle',
          'selfie_visibility_bundle', 'selfie_ai_photos_kit'
        )
        AND COALESCE(sp.customer_email, u.email) IS NOT NULL
      GROUP BY LOWER(BTRIM(COALESCE(sp.customer_email, u.email)))
    `,
    sql`
      SELECT DISTINCT LOWER(BTRIM(u.email)) AS email
      FROM users u
      JOIN subscriptions s ON s.user_id::text = u.id::text
      WHERE u.email IS NOT NULL
        AND COALESCE(s.is_test_mode, FALSE) = FALSE
        AND (
          (s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro', 'vault_maya')
            AND s.status IN ('active', 'trialing', 'past_due'))
          OR (s.product_type IN ('suite_trial', 'selfie_visibility_bundle_pass')
            AND s.status = 'active'
            AND s.trial_ends_at > ${asOf.toISOString()})
        )
    `,
    sql`
      SELECT DISTINCT ON (LOWER(BTRIM(user_email)))
        LOWER(BTRIM(user_email)) AS email,
        status
      FROM email_logs
      WHERE user_email IS NOT NULL
      ORDER BY LOWER(BTRIM(user_email)), COALESCE(sent_at, created_at) DESC, created_at DESC
    `,
    sql`
      SELECT
        LOWER(BTRIM(user_email)) AS email,
        MAX(COALESCE(sent_at, created_at))::text AS last_delivery_at
      FROM email_logs
      WHERE user_email IS NOT NULL
        AND status IN ('sent', 'delivered')
      GROUP BY LOWER(BTRIM(user_email))
    `,
    sql`
      SELECT DISTINCT LOWER(BTRIM(email)) AS email
      FROM freebie_subscribers
      WHERE email IS NOT NULL
        AND (source = 'funnel-test' OR source LIKE 'codex-%')
    `,
  ])

  const normalizedBuyerRows = (
    buyerRows as Array<{ email?: string | null; last_purchase_at?: string | null }>
  ).map(row => ({ ...row, email: normalizeEmail(row.email) }))
  const contactsByEmail = new Map<string, Awaited<ReturnType<typeof getContact>>>()
  for (let offset = 0; offset < normalizedBuyerRows.length; offset += CONTACT_BATCH_SIZE) {
    const batchStartedAt = Date.now()
    const batch = normalizedBuyerRows.slice(offset, offset + CONTACT_BATCH_SIZE)
    const contacts = await Promise.all(
      batch.map(row => getContact(resend, audienceId, row.email))
    )
    batch.forEach((row, index) => contactsByEmail.set(row.email, contacts[index] || null))
    const elapsed = Date.now() - batchStartedAt
    if (offset + batch.length < normalizedBuyerRows.length && elapsed < CONTACT_BATCH_WINDOW_MS) {
      await sleep(CONTACT_BATCH_WINDOW_MS - elapsed)
    }
  }

  const protectedEmails = new Set(
    (protectedRows as Array<{ email?: string | null }>).map(row => normalizeEmail(row.email))
  )
  const statuses = new Map(
    (statusRows as Array<{ email?: string | null; status?: string | null }>).map(row => [
      normalizeEmail(row.email),
      row.status || null,
    ])
  )
  const deliveries = new Map(
    (deliveryRows as Array<{ email?: string | null; last_delivery_at?: string | null }>).map(row => [
      normalizeEmail(row.email),
      row.last_delivery_at || null,
    ])
  )
  const testEmails = new Set(
    (testRows as Array<{ email?: string | null }>).map(row => normalizeEmail(row.email))
  )
  const candidates: MayaTierPilotCandidate[] = normalizedBuyerRows.map(row => {
    const email = row.email
    const contact = contactsByEmail.get(email)
    return {
      email,
      isCommerceBuyer: true,
      hasProtectedAccess: protectedEmails.has(email),
      marketingPermissionKnown: Boolean(contact),
      unsubscribed: contact?.unsubscribed,
      isMarketingTestOrInternal: email.endsWith("@sselfie.ai") || testEmails.has(email),
      latestDeliveryStatus: statuses.get(email) || null,
      lastPurchaseAt: row.last_purchase_at || null,
      lastMarketingDeliveryAt: deliveries.get(email) || null,
    }
  })

  const result = classifyMayaTierPilotAudience({ candidates, now: asOf })
  const cohortFingerprint = createHash("sha256")
    .update(MAYA_TIER_PILOT.campaignKey)
    .update("\n")
    .update(result.eligible.map(candidate => candidate.email).sort().join("\n"))
    .digest("hex")

  console.log(JSON.stringify({
    campaignKey: MAYA_TIER_PILOT.campaignKey,
    asOf: asOf.toISOString(),
    status: MAYA_TIER_PILOT.status,
    maxCohort: MAYA_TIER_PILOT.maxCohort,
    eligibleCount: result.eligible.length,
    excluded: result.excluded,
    cohortFingerprint,
    identitiesPrinted: false,
    mutationsPerformed: false,
    nextBoundary: "Rebuild immediately before exact invitation approval.",
  }, null, 2))
}

main().catch(error => {
  console.error(`[maya-tier-pilot-audit] ${error instanceof Error ? error.message : "Audit failed"}`)
  process.exitCode = 1
})
