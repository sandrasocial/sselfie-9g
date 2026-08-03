/**
 * Prepare and activate the approved August 2026 Vault Maya launch.
 *
 * Safe defaults:
 *   pnpm exec tsx scripts/prepare-vault-maya-launch.ts              audit only
 *   ... --prepare                                                   create/sync static segments
 *   ... --send-day0-small                                           SUITE + commerce buyers
 *   ... --send-day0-main                                            eligible nonbuyers
 * Future follow-ups run from /api/cron/vault-maya-launch, immediately after a
 * fresh buyer/SUITE suppression sweep. They are not scheduled as recipient snapshots.
 *
 * Every operation is idempotent by segment name and campaign key. No recipient
 * addresses are printed. New Vault Maya buyers are removed by the paid-fulfillment hook.
 */

import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { Resend, type Contact, type Segment } from "resend"

import { classifyVaultMayaLaunchAudience } from "../lib/email/campaigns/vault-maya-launch-audience"
import {
  generateVaultMayaBuyerAnnouncementEmail,
  generateVaultMayaListAnnouncementEmail,
  generateVaultMayaSuiteIncludedEmail,
  type VaultMayaMarketingEmail,
} from "../lib/email/templates/vault-maya-marketing"

dotenv.config({ path: ".env.local" })

const SEGMENT_NAMES = {
  suite: "Vault Maya Launch · SUITE · 2026-08-03",
  commerce: "Vault Maya Launch · Commerce Buyers · 2026-08-03",
  nonbuyers: "Vault Maya Launch · Nonbuyers · 2026-08-03",
  highIntent: "Vault Maya Launch · High Intent · 2026-08-03",
} as const

const MERGE_FIRST_NAME = "{{{contact.first_name|there}}}"
const REQUEST_DELAY_MS = 250
// Resend's default team limit is five requests per second. Four-contact windows
// leave one request per second available for normal transactional traffic.
const CONTACT_BATCH_SIZE = 4
const CONTACT_BATCH_WINDOW_MS = 1_050
const PROGRESS_EVERY = 100

type SegmentKey = keyof typeof SEGMENT_NAMES
type LaunchSegments = Record<SegmentKey, Segment>

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function requiredEnv(name: string): string {
  const value = String(process.env[name] || "").trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

async function listAllSegments(resend: Resend): Promise<Segment[]> {
  const all: Segment[] = []
  let after: string | undefined
  do {
    const { data, error } = await resend.segments.list({ limit: 100, ...(after ? { after } : {}) })
    if (error) throw new Error(error.message || "Failed to list Resend segments")
    const page = data?.data || []
    all.push(...page)
    if (!data?.has_more || page.length === 0) break
    after = page[page.length - 1]?.id
  } while (after)
  return all
}

async function listAllContacts(resend: Resend, segmentId: string): Promise<Contact[]> {
  const all: Contact[] = []
  let after: string | undefined
  do {
    const { data, error } = await resend.contacts.list({
      segmentId,
      limit: 100,
      ...(after ? { after } : {}),
    })
    if (error) throw new Error(error.message || `Failed to list contacts for ${segmentId}`)
    const page = data?.data || []
    all.push(...page)
    if (!data?.has_more || page.length === 0) break
    after = page[page.length - 1]?.id
  } while (after)
  return all
}

async function getOrCreateSegments(resend: Resend, create: boolean): Promise<LaunchSegments | null> {
  const existing = await listAllSegments(resend)
  const result = {} as LaunchSegments

  for (const [key, name] of Object.entries(SEGMENT_NAMES) as [SegmentKey, string][]) {
    let segment = existing.find(item => item.name === name)
    if (!segment && create) {
      const { data, error } = await resend.segments.create({ name })
      if (error || !data?.id) throw new Error(error?.message || `Failed to create ${name}`)
      segment = { id: data.id, name: data.name, created_at: new Date().toISOString() }
      await sleep(REQUEST_DELAY_MS)
    }
    if (!segment) return null
    result[key] = segment
  }

  return result
}

async function queryEmailSet(sql: ReturnType<typeof neon>, query: "suite" | "excluded" | "buyers") {
  const rows =
    query === "suite"
      ? await sql`
          SELECT DISTINCT LOWER(BTRIM(u.email)) AS email
          FROM users u
          JOIN subscriptions s ON s.user_id::text = u.id::text
          WHERE u.email IS NOT NULL
            AND COALESCE(s.is_test_mode, FALSE) = FALSE
            AND s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro')
            AND s.status = 'active'
        `
      : query === "excluded"
        ? await sql`
            SELECT DISTINCT LOWER(BTRIM(u.email)) AS email
            FROM users u
            JOIN subscriptions s ON s.user_id::text = u.id::text
            WHERE u.email IS NOT NULL
              AND COALESCE(s.is_test_mode, FALSE) = FALSE
              AND (
                (s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro', 'vault_maya')
                  AND s.status = 'active')
                OR (s.product_type IN ('suite_trial', 'selfie_visibility_bundle_pass')
                  AND s.status = 'active'
                  AND s.trial_ends_at > NOW())
              )
          `
        : await sql`
            SELECT DISTINCT LOWER(BTRIM(COALESCE(sp.customer_email, u.email))) AS email
            FROM stripe_payments sp
            LEFT JOIN users u ON u.id::text = sp.user_id::text
            WHERE sp.status IN ('succeeded', 'paid')
              AND COALESCE(sp.is_test_mode, FALSE) = FALSE
              AND sp.product_type IN (
                'prompt_vault',
                'starter_kit',
                'presets_single',
                'presets_bundle',
                'selfie_visibility_bundle',
                'selfie_ai_photos_kit'
              )
              AND COALESCE(sp.customer_email, u.email) IS NOT NULL
          `

  return new Set(
    (rows as { email?: string | null }[])
      .map(row => String(row.email || "").trim().toLowerCase())
      .filter(Boolean),
  )
}

async function buildAudienceSnapshot(resend: Resend, sql: ReturnType<typeof neon>) {
  const mainAudienceId = requiredEnv("RESEND_AUDIENCE_ID")
  const contacts = await listAllContacts(resend, mainAudienceId)
  const [paidSuiteEmails, salesExcludedEmails, commerceBuyerEmails] = await Promise.all([
    queryEmailSet(sql, "suite"),
    queryEmailSet(sql, "excluded"),
    queryEmailSet(sql, "buyers"),
  ])

  return classifyVaultMayaLaunchAudience({
    contacts: contacts.map(contact => ({
      email: contact.email,
      firstName: contact.first_name,
      unsubscribed: contact.unsubscribed,
    })),
    paidSuiteEmails,
    salesExcludedEmails,
    commerceBuyerEmails,
  })
}

async function addContactWithRetry(resend: Resend, email: string, segmentId: string): Promise<void> {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const { error } = await resend.contacts.segments.add({ email, segmentId })
    if (!error || /already|exists|409/i.test(String(error.message || ""))) return
    const message = String(error.message || "")
    if (!/429|rate|too many/i.test(message) || attempt === 6) throw new Error(message)
    await sleep(Math.min(10_000, 800 * 2 ** (attempt - 1)))
  }
}

async function syncSegment(
  resend: Resend,
  segment: Segment,
  contacts: Array<{ email: string }>,
  label: string,
) {
  const existing = new Set(
    (await listAllContacts(resend, segment.id)).map(contact => contact.email.trim().toLowerCase()),
  )
  const pending = contacts.filter(contact => !existing.has(contact.email.trim().toLowerCase()))

  console.log(`[vault-maya-launch] ${label}: ${contacts.length} desired, ${pending.length} to add`)
  let added = 0
  for (let offset = 0; offset < pending.length; offset += CONTACT_BATCH_SIZE) {
    const batchStartedAt = Date.now()
    const batch = pending.slice(offset, offset + CONTACT_BATCH_SIZE)
    await Promise.all(
      batch.map(contact => addContactWithRetry(resend, contact.email, segment.id)),
    )
    added += batch.length
    if (added % PROGRESS_EVERY === 0 || added === pending.length) {
      console.log(`[vault-maya-launch] ${label}: added ${added}/${pending.length}`)
    }
    const elapsed = Date.now() - batchStartedAt
    if (offset + batch.length < pending.length && elapsed < CONTACT_BATCH_WINDOW_MS) {
      await sleep(CONTACT_BATCH_WINDOW_MS - elapsed)
    }
  }

  const finalCount = (await listAllContacts(resend, segment.id)).filter(
    contact => !contact.unsubscribed,
  ).length
  if (finalCount !== contacts.length) {
    throw new Error(`${label} segment count mismatch: expected ${contacts.length}, got ${finalCount}`)
  }
  return finalCount
}

function printSnapshot(snapshot: Awaited<ReturnType<typeof buildAudienceSnapshot>>) {
  console.log("[vault-maya-launch] audited audience counts", {
    subscribed: snapshot.subscribed,
    suite: snapshot.suite.length,
    commerce: snapshot.commerce.length,
    nonbuyers: snapshot.nonbuyers.length,
    protectedNotSuite: snapshot.protectedNotSuite,
    eligibleNonmembers: snapshot.eligibleNonmembers,
  })
}

async function campaignAlreadySent(sql: ReturnType<typeof neon>, campaignKey: string) {
  const rows = await sql`
    SELECT 1
    FROM email_events
    WHERE campaign_key = ${campaignKey}
      AND status = 'success'
      AND event_type = 'broadcast_sent'
    LIMIT 1
  `
  return rows.length > 0
}

async function deliverBroadcast(input: {
  sql: ReturnType<typeof neon>
  segment: Segment
  count: number
  campaignKey: string
  email: VaultMayaMarketingEmail
}) {
  if (await campaignAlreadySent(input.sql, input.campaignKey)) {
    console.log(`[vault-maya-launch] ${input.campaignKey}: already sent, skipping`)
    return
  }

  const { sendMarketingBroadcast } = await import("../lib/email/marketing-sender")
  const result = await sendMarketingBroadcast({
    campaignKey: input.campaignKey,
    subject: input.email.subject,
    html: input.email.html,
    text: input.email.text,
    segmentId: input.segment.id,
    estimatedRecipientCount: input.count,
  })

  if (result.dryRun) throw new Error(`${input.campaignKey} was suppressed by EMAIL_DRY_RUN`)
  console.log(`[vault-maya-launch] ${input.campaignKey}: provider accepted`, {
    broadcastId: result.broadcastId,
    delivery: "immediate",
    recipients: input.count,
  })
}

function emailParams() {
  return { firstName: MERGE_FIRST_NAME }
}

async function assertPreparedCounts(
  resend: Resend,
  segments: LaunchSegments,
  snapshot: Awaited<ReturnType<typeof buildAudienceSnapshot>>,
) {
  const counts = {
    suite: (await listAllContacts(resend, segments.suite.id)).filter(c => !c.unsubscribed).length,
    commerce: (await listAllContacts(resend, segments.commerce.id)).filter(c => !c.unsubscribed).length,
    nonbuyers: (await listAllContacts(resend, segments.nonbuyers.id)).filter(c => !c.unsubscribed).length,
    highIntent: (await listAllContacts(resend, segments.highIntent.id)).filter(c => !c.unsubscribed).length,
  }
  if (counts.suite !== snapshot.suite.length) throw new Error("SUITE segment is not reconciled")
  if (counts.commerce !== snapshot.commerce.length) throw new Error("Commerce segment is not reconciled")
  if (counts.nonbuyers !== snapshot.nonbuyers.length) throw new Error("Nonbuyer segment is not reconciled")
  console.log("[vault-maya-launch] prepared segment counts", counts)
  return counts
}

async function main() {
  const apiKey = requiredEnv("RESEND_API_KEY")
  const databaseUrl = requiredEnv("DATABASE_URL")
  const resend = new Resend(apiKey)
  const sql = neon(databaseUrl)
  const args = new Set(process.argv.slice(2))

  if (String(process.env.EMAIL_DRY_RUN || "").trim().toLowerCase() === "true" && args.size > 0) {
    throw new Error("EMAIL_DRY_RUN=true; launch activation is intentionally blocked")
  }

  const snapshot = await buildAudienceSnapshot(resend, sql)
  printSnapshot(snapshot)

  const shouldCreate = args.has("--prepare")
  const segments = await getOrCreateSegments(resend, shouldCreate)
  if (!segments) {
    if (args.size > 0) throw new Error("Launch segments do not exist; run with --prepare first")
    console.log("[vault-maya-launch] audit only; launch segments have not been created")
    return
  }

  console.log("[vault-maya-launch] segment identifiers", {
    suite: segments.suite.id,
    commerce: segments.commerce.id,
    nonbuyers: segments.nonbuyers.id,
    highIntent: segments.highIntent.id,
  })

  if (shouldCreate) {
    await syncSegment(resend, segments.suite, snapshot.suite, "SUITE")
    await syncSegment(resend, segments.commerce, snapshot.commerce, "commerce")
    await syncSegment(resend, segments.nonbuyers, snapshot.nonbuyers, "nonbuyers")
    console.log("[vault-maya-launch] preparation complete")
    return
  }

  const counts = await assertPreparedCounts(resend, segments, snapshot)

  if (args.has("--send-day0-small")) {
    await deliverBroadcast({
      sql,
      segment: segments.suite,
      count: counts.suite,
      campaignKey: "vault_maya_launch_suite_included",
      email: generateVaultMayaSuiteIncludedEmail(emailParams()),
    })
    await deliverBroadcast({
      sql,
      segment: segments.commerce,
      count: counts.commerce,
      campaignKey: "vault_maya_launch_buyer_announcement",
      email: generateVaultMayaBuyerAnnouncementEmail(emailParams()),
    })
  }

  if (args.has("--send-day0-main")) {
    await deliverBroadcast({
      sql,
      segment: segments.nonbuyers,
      count: counts.nonbuyers,
      campaignKey: "vault_maya_launch_list_announcement",
      email: generateVaultMayaListAnnouncementEmail(emailParams()),
    })
  }

  if (!["--send-day0-small", "--send-day0-main"].some(flag => args.has(flag))) {
    console.log("[vault-maya-launch] audit only; no send or schedule flag supplied")
  }
}

main().catch(error => {
  console.error("[vault-maya-launch] failed:", error instanceof Error ? error.message : error)
  process.exit(1)
})
