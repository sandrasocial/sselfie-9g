/**
 * Prepare and schedule the approved full-list SUITE proof email.
 *
 * Safe default:
 *   pnpm exec tsx scripts/prepare-suite-proof-sprint-full-audience.ts
 *
 * Approved execution:
 *   SUITE_PROOF_SPRINT_FULL_SEND_APPROVED=1 pnpm exec tsx \
 *     scripts/prepare-suite-proof-sprint-full-audience.ts --prepare --schedule
 *
 * No recipient email addresses are printed. The full-list segment is rebuilt
 * from current Resend and database state before a scheduled broadcast is accepted.
 */

/* eslint-disable no-console -- attended campaign CLI reports aggregate progress only. */

import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { Resend, type Contact, type Segment } from "resend"

import { classifySuiteProofSprintFullAudience } from "../lib/email/campaigns/suite-proof-sprint-full-audience"
import {
  SUITE_PROOF_SPRINT,
  SUITE_PROOF_SPRINT_REVIEW_PROOF,
} from "../lib/email/campaigns/suite-proof-sprint-plan"
import { generateSuiteProofSprintEmail } from "../lib/email/templates/suite-proof-sprint"

dotenv.config({ path: process.env.SSELFIE_ENV_PATH || ".env.local" })

const SEGMENT_NAME = "SUITE Proof Sprint · Full List · 2026-08-06"
const CAMPAIGN_KEY = "suite_proof_sprint_full_list_2026_08_06"
const SCHEDULED_AT = new Date("2026-08-06T08:15:00.000Z")
const MAX_AUDIENCE = 10_000
const CONTACT_BATCH_SIZE = 4
const CONTACT_BATCH_WINDOW_MS = 1_050
const PROGRESS_EVERY = 100
const MERGE_FIRST_NAME = "{{{contact.first_name|there}}}"

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function requiredEnv(name: string): string {
  const value = String(process.env[name] || "").trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

async function listAllContacts(resend: Resend, segmentId: string): Promise<Contact[]> {
  const contacts: Contact[] = []
  let after: string | undefined
  do {
    let response: Awaited<ReturnType<typeof resend.contacts.list>> | null = null
    for (let attempt = 1; attempt <= 6; attempt++) {
      response = await resend.contacts.list({
        segmentId,
        limit: 100,
        ...(after ? { after } : {}),
      })
      const message = String(response.error?.message || "")
      if (!response.error || !/429|rate|too many/i.test(message) || attempt === 6) break
      await sleep(Math.min(10_000, 800 * 2 ** (attempt - 1)))
    }
    const { data, error } = response || {}
    if (error) throw new Error(error.message || "Failed to list Resend contacts")
    const page = data?.data || []
    contacts.push(...page)
    if (!data?.has_more || page.length === 0) break
    after = page[page.length - 1]?.id
  } while (after)
  return contacts
}

async function listAllSegments(resend: Resend): Promise<Segment[]> {
  const segments: Segment[] = []
  let after: string | undefined
  do {
    let response: Awaited<ReturnType<typeof resend.segments.list>> | null = null
    for (let attempt = 1; attempt <= 6; attempt++) {
      response = await resend.segments.list({
        limit: 100,
        ...(after ? { after } : {}),
      })
      const message = String(response.error?.message || "")
      if (!response.error || !/429|rate|too many/i.test(message) || attempt === 6) break
      await sleep(Math.min(10_000, 800 * 2 ** (attempt - 1)))
    }
    const { data, error } = response || {}
    if (error) throw new Error(error.message || "Failed to list Resend segments")
    const page = data?.data || []
    segments.push(...page)
    if (!data?.has_more || page.length === 0) break
    after = page[page.length - 1]?.id
  } while (after)
  return segments
}

async function getSegment(resend: Resend, create: boolean): Promise<Segment | null> {
  const existing = (await listAllSegments(resend)).find(segment => segment.name === SEGMENT_NAME)
  if (existing || !create) return existing || null
  const { data, error } = await resend.segments.create({ name: SEGMENT_NAME })
  if (error || !data?.id) throw new Error(error?.message || "Failed to create full-list segment")
  return { id: data.id, name: data.name, created_at: new Date().toISOString() }
}

async function buildSnapshot(resend: Resend, sql: ReturnType<typeof neon>) {
  const mainAudienceId = requiredEnv("RESEND_AUDIENCE_ID")
  const [contacts, protectedRows, latestStatusRows, lastMarketingDeliveryRows] = await Promise.all([
    listAllContacts(resend, mainAudienceId),
    sql`
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
        (EXTRACT(EPOCH FROM MAX(COALESCE(sent_at, created_at))) * 1000)::bigint::text AS last_delivery_ms
      FROM email_logs
      WHERE user_email IS NOT NULL
        AND status IN ('sent', 'delivered')
      GROUP BY LOWER(BTRIM(user_email))
    `,
  ])

  const protectedEmails = new Set(
    (protectedRows as Array<{ email?: string | null }>)
      .map(row => String(row.email || "").trim().toLowerCase())
      .filter(Boolean),
  )
  const latestStatus = new Map(
    (latestStatusRows as Array<{
      email?: string | null
      status?: string | null
    }>).map(row => [String(row.email || "").trim().toLowerCase(), row] as const),
  )
  const lastMarketingDelivery = new Map(
    (lastMarketingDeliveryRows as Array<{
      email?: string | null
      last_delivery_ms?: string | null
    }>).map(row => [String(row.email || "").trim().toLowerCase(), row.last_delivery_ms] as const),
  )

  const result = classifySuiteProofSprintFullAudience({
    candidates: contacts.map(contact => {
      const email = contact.email.trim().toLowerCase()
      const deliveryStatus = latestStatus.get(email)?.status
      const lastDeliveryMs = Number(lastMarketingDelivery.get(email))
      return {
        email,
        firstName: contact.first_name,
        unsubscribed: contact.unsubscribed,
        hasProtectedAccess: protectedEmails.has(email),
        latestDeliveryStatus: deliveryStatus,
        lastMarketingDeliveryAt: Number.isFinite(lastDeliveryMs)
          ? new Date(lastDeliveryMs).toISOString()
          : null,
      }
    }),
    scheduledAt: SCHEDULED_AT,
    cooldownHours: SUITE_PROOF_SPRINT.cooldownHours,
    maxAudience: MAX_AUDIENCE,
  })

  return { contacts, result }
}

async function mutateMembershipWithRetry(input: {
  resend: Resend
  action: "add" | "remove"
  contactId: string
  segmentId: string
}) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const response = input.action === "add"
      ? await input.resend.contacts.segments.add({ contactId: input.contactId, segmentId: input.segmentId })
      : await input.resend.contacts.segments.remove({ contactId: input.contactId, segmentId: input.segmentId })
    if (!response.error || /already|exists|not found|404|409/i.test(String(response.error.message || ""))) {
      return
    }
    const message = String(response.error.message || "")
    if (!/429|rate|too many/i.test(message) || attempt === 6) {
      throw new Error(`Resend segment ${input.action} failed`)
    }
    await sleep(Math.min(10_000, 800 * 2 ** (attempt - 1)))
  }
}

async function runBatches(input: {
  resend: Resend
  action: "add" | "remove"
  contacts: Contact[]
  segmentId: string
}) {
  let completed = 0
  for (let offset = 0; offset < input.contacts.length; offset += CONTACT_BATCH_SIZE) {
    const startedAt = Date.now()
    const batch = input.contacts.slice(offset, offset + CONTACT_BATCH_SIZE)
    await Promise.all(batch.map(contact => mutateMembershipWithRetry({
      resend: input.resend,
      action: input.action,
      contactId: contact.id,
      segmentId: input.segmentId,
    })))
    completed += batch.length
    if (completed % PROGRESS_EVERY === 0 || completed === input.contacts.length) {
      console.log(`[suite-proof-full] ${input.action}: ${completed}/${input.contacts.length}`)
    }
    const elapsed = Date.now() - startedAt
    if (offset + batch.length < input.contacts.length && elapsed < CONTACT_BATCH_WINDOW_MS) {
      await sleep(CONTACT_BATCH_WINDOW_MS - elapsed)
    }
  }
}

async function reconcileSegment(input: {
  resend: Resend
  segment: Segment
  desired: Array<{ email: string }>
}) {
  const [mainContacts, segmentContacts] = await Promise.all([
    listAllContacts(input.resend, requiredEnv("RESEND_AUDIENCE_ID")),
    listAllContacts(input.resend, input.segment.id),
  ])
  const desiredEmails = new Set(input.desired.map(contact => contact.email.trim().toLowerCase()))
  const primaryMainContactByEmail = new Map<string, Contact>()
  for (const contact of mainContacts) {
    const email = contact.email.trim().toLowerCase()
    if (!primaryMainContactByEmail.has(email)) primaryMainContactByEmail.set(email, contact)
  }
  const primarySegmentContactByEmail = new Map<string, Contact>()
  const duplicateSegmentContacts: Contact[] = []
  for (const contact of segmentContacts) {
    const email = contact.email.trim().toLowerCase()
    if (primarySegmentContactByEmail.has(email)) duplicateSegmentContacts.push(contact)
    else primarySegmentContactByEmail.set(email, contact)
  }
  const segmentEmails = new Set(primarySegmentContactByEmail.keys())
  const toAdd = [...desiredEmails]
    .filter(email => !segmentEmails.has(email))
    .flatMap(email => primaryMainContactByEmail.get(email) || [])
  const toRemove = [
    ...segmentContacts.filter(contact => !desiredEmails.has(contact.email.trim().toLowerCase())),
    ...duplicateSegmentContacts.filter(contact => desiredEmails.has(contact.email.trim().toLowerCase())),
  ]

  console.log("[suite-proof-full] segment reconciliation", {
    desired: desiredEmails.size,
    existing: segmentEmails.size,
    duplicateRecords: duplicateSegmentContacts.length,
    toAdd: toAdd.length,
    toRemove: toRemove.length,
  })
  await runBatches({ resend: input.resend, action: "remove", contacts: toRemove, segmentId: input.segment.id })
  await runBatches({ resend: input.resend, action: "add", contacts: toAdd, segmentId: input.segment.id })

  const finalContacts = (await listAllContacts(input.resend, input.segment.id))
    .filter(contact => !contact.unsubscribed)
  const finalEmails = new Set(finalContacts.map(contact => contact.email.trim().toLowerCase()))
  const missing = [...desiredEmails].filter(email => !finalEmails.has(email)).length
  const extra = [...finalEmails].filter(email => !desiredEmails.has(email)).length
  if (
    finalContacts.length !== desiredEmails.size ||
    finalEmails.size !== desiredEmails.size ||
    missing > 0 ||
    extra > 0
  ) {
    throw new Error(
      `Full-list segment mismatch: desired=${desiredEmails.size}, records=${finalContacts.length}, unique=${finalEmails.size}, missing=${missing}, extra=${extra}; broadcast blocked`,
    )
  }
  return finalEmails.size
}

function printAudit(snapshot: Awaited<ReturnType<typeof buildSnapshot>>) {
  console.log("[suite-proof-full] audience audit", {
    mainContacts: snapshot.contacts.length,
    scheduledAt: SCHEDULED_AT.toISOString(),
    eligible: snapshot.result.eligible.length,
    excluded: snapshot.result.excluded,
  })
}

async function main() {
  const args = new Set(process.argv.slice(2))
  const shouldPrepare = args.has("--prepare")
  const shouldSchedule = args.has("--schedule")
  const approved = process.env.SUITE_PROOF_SPRINT_FULL_SEND_APPROVED === "1"
  if ((shouldPrepare || shouldSchedule) && !approved) {
    throw new Error("SUITE_PROOF_SPRINT_FULL_SEND_APPROVED=1 is required for mutation or scheduling")
  }
  if (SCHEDULED_AT.getTime() <= Date.now() + 30 * 60 * 1000 && shouldSchedule) {
    throw new Error("Scheduled send window is too close or has passed; broadcast blocked")
  }

  const resend = new Resend(requiredEnv("RESEND_API_KEY"))
  const sql = neon(requiredEnv("DATABASE_URL"))
  let snapshot = await buildSnapshot(resend, sql)
  printAudit(snapshot)

  const segment = await getSegment(resend, shouldPrepare)
  if (!segment) {
    if (shouldSchedule) throw new Error("Full-list segment is missing; run with --prepare")
    console.log("[suite-proof-full] audit only; no mutation and no send")
    return
  }

  if (shouldPrepare) {
    await reconcileSegment({ resend, segment, desired: snapshot.result.eligible })
    snapshot = await buildSnapshot(resend, sql)
    printAudit(snapshot)
    await reconcileSegment({ resend, segment, desired: snapshot.result.eligible })
  }

  if (!shouldSchedule) {
    console.log("[suite-proof-full] segment prepared; no broadcast scheduled")
    return
  }

  const finalCount = await reconcileSegment({
    resend,
    segment,
    desired: snapshot.result.eligible,
  })
  const email = generateSuiteProofSprintEmail({
    firstName: MERGE_FIRST_NAME,
    proof: SUITE_PROOF_SPRINT_REVIEW_PROOF,
    recipientContext: "subscriber-or-buyer",
  })
  if (email.status !== "ready-for-approval") throw new Error("Approved proof is missing; broadcast blocked")

  process.env.EMAIL_DRY_RUN = "false"
  const { sendMarketingBroadcast } = await import("../lib/email/marketing-sender")
  const result = await sendMarketingBroadcast({
    campaignKey: CAMPAIGN_KEY,
    subject: email.subject,
    html: email.html,
    text: email.text,
    segmentId: segment.id,
    scheduledAt: SCHEDULED_AT.toISOString(),
    estimatedRecipientCount: finalCount,
  })
  if (result.dryRun || !result.broadcastId) throw new Error("Resend did not accept the scheduled broadcast")
  console.log("[suite-proof-full] provider accepted scheduled broadcast", {
    broadcastId: result.broadcastId,
    scheduledAt: SCHEDULED_AT.toISOString(),
    recipients: finalCount,
  })
}

main().catch(error => {
  console.error("[suite-proof-full] failed:", error instanceof Error ? error.message : error)
  process.exit(1)
})
