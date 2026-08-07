/**
 * Audit or prepare the attended Prompt Vault proof recovery broadcast.
 *
 * Safe default (read only):
 *   pnpm exec tsx scripts/prepare-prompt-vault-proof-recovery.ts
 *
 * Approved preparation (segment reconciliation + Resend draft only, never sends):
 *   PROMPT_VAULT_PROOF_RECOVERY_PREPARE_APPROVED=1 pnpm exec tsx \
 *     scripts/prepare-prompt-vault-proof-recovery.ts --prepare
 */

/* eslint-disable no-console -- attended campaign CLI prints aggregate progress only. */

import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { Resend, type Contact, type Segment } from "resend"

import { EMAIL_CONFIG } from "../lib/email/config"
import { classifyPromptVaultProofRecoveryAudience } from "../lib/email/campaigns/prompt-vault-proof-recovery-audience"
import { generatePromptVaultProofRecoveryEmail } from "../lib/email/templates/prompt-vault-proof-recovery"

dotenv.config({ path: process.env.SSELFIE_ENV_PATH || ".env.local" })

const SEGMENT_NAME = "Prompt Vault · Recent Prompt Leads · 2026-08-08"
const CAMPAIGN_KEY = "prompt_vault_proof_recovery_2026_08_08"
const MERGE_FIRST_NAME = "{{{contact.first_name|there}}}"
const FROM = EMAIL_CONFIG.marketing.from
const REPLY_TO = EMAIL_CONFIG.marketing.replyTo
const CONTACT_BATCH_SIZE = 4
const CONTACT_BATCH_WINDOW_MS = 1_050

type CandidateRow = {
  email: string
  first_name: string | null
  is_vault_buyer: boolean
  is_internal_or_test: boolean
  blocked_delivery: boolean
  received_recent_vault_offer: boolean
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function requiredEnv(name: string) {
  const value = String(process.env[name] || "").trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

async function withRetry<T>(label: string, operation: () => Promise<{ data: T | null; error: { message?: string } | null }>) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const result = await operation()
    const message = String(result.error?.message || "")
    if (!result.error || !/429|rate|too many/i.test(message) || attempt === 6) {
      if (result.error) throw new Error(`${label}: ${message || "unknown Resend error"}`)
      return result.data
    }
    await sleep(Math.min(10_000, 800 * 2 ** (attempt - 1)))
  }
  throw new Error(`${label}: retry exhausted`)
}

async function listAllContacts(resend: Resend, segmentId: string): Promise<Contact[]> {
  const contacts: Contact[] = []
  let after: string | undefined
  do {
    const data = await withRetry("contacts.list", () =>
      resend.contacts.list({ segmentId, limit: 100, ...(after ? { after } : {}) })
    )
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
    const data = await withRetry("segments.list", () =>
      resend.segments.list({ limit: 100, ...(after ? { after } : {}) })
    )
    const page = data?.data || []
    segments.push(...page)
    if (!data?.has_more || page.length === 0) break
    after = page[page.length - 1]?.id
  } while (after)
  return segments
}

async function getOrCreateSegment(resend: Resend): Promise<Segment> {
  const existing = (await listAllSegments(resend)).find(segment => segment.name === SEGMENT_NAME)
  if (existing) return existing
  const data = await withRetry("segments.create", () => resend.segments.create({ name: SEGMENT_NAME }))
  if (!data?.id) throw new Error("Resend did not return a segment id")
  return { id: data.id, name: data.name, created_at: new Date().toISOString() }
}

async function loadCandidateRows(sql: ReturnType<typeof neon>): Promise<CandidateRow[]> {
  return (await sql`
    SELECT DISTINCT ON (LOWER(BTRIM(fs.email)))
      LOWER(BTRIM(fs.email)) AS email,
      NULLIF(BTRIM(fs.name), '') AS first_name,
      EXISTS (
        SELECT 1
        FROM freebie_subscribers buyer_fs
        WHERE LOWER(BTRIM(buyer_fs.email)) = LOWER(BTRIM(fs.email))
          AND (
            buyer_fs.source = 'prompt-vault-paid'
            OR 'prompt-vault-paid' = ANY(COALESCE(buyer_fs.email_tags, ARRAY[]::text[]))
            OR 'bought_prompt_vault' = ANY(COALESCE(buyer_fs.email_tags, ARRAY[]::text[]))
          )
      ) OR EXISTS (
        SELECT 1
        FROM stripe_payments sp
        WHERE LOWER(BTRIM(sp.customer_email)) = LOWER(BTRIM(fs.email))
          AND sp.product_type = 'prompt_vault'
          AND sp.status = 'succeeded'
          AND COALESCE(sp.is_test_mode, FALSE) = FALSE
      ) AS is_vault_buyer,
      (
        LOWER(BTRIM(fs.email)) LIKE '%@example.com'
        OR LOWER(BTRIM(fs.email)) LIKE '%@sselfie.ai'
        OR fs.source = 'funnel-test'
        OR fs.source LIKE 'codex-%'
      ) AS is_internal_or_test,
      EXISTS (
        SELECT 1
        FROM email_logs blocked
        WHERE LOWER(BTRIM(blocked.user_email)) = LOWER(BTRIM(fs.email))
          AND blocked.status IN ('bounced', 'complained', 'suppressed', 'unsubscribed', 'unsubscribe')
      ) AS blocked_delivery,
      EXISTS (
        SELECT 1
        FROM email_logs recent
        WHERE LOWER(BTRIM(recent.user_email)) = LOWER(BTRIM(fs.email))
          AND recent.email_type IN (
            'ai-prompts-day7-prompt-vault-offer',
            'ai-prompts-day9-prompt-vault-proof'
          )
          AND recent.status IN ('sent', 'delivered')
          AND COALESCE(recent.sent_at, recent.created_at) >= NOW() - INTERVAL '72 hours'
      ) AS received_recent_vault_offer
    FROM freebie_subscribers fs
    WHERE fs.email IS NOT NULL
      AND fs.created_at >= NOW() - INTERVAL '30 days'
      AND (
        fs.source = 'ai-prompts'
        OR 'ai-prompts-subscriber' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
        OR 'ai-photoshoot-audience' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
      )
    ORDER BY LOWER(BTRIM(fs.email)), fs.created_at DESC
  `) as CandidateRow[]
}

async function buildSnapshot(resend: Resend, sql: ReturnType<typeof neon>) {
  const [candidateRows, mainContacts] = await Promise.all([
    loadCandidateRows(sql),
    listAllContacts(resend, requiredEnv("RESEND_AUDIENCE_ID")),
  ])
  const contactByEmail = new Map<string, Contact>()
  for (const contact of mainContacts) {
    const email = contact.email.trim().toLowerCase()
    if (!contactByEmail.has(email)) contactByEmail.set(email, contact)
  }
  const result = classifyPromptVaultProofRecoveryAudience(
    candidateRows.map(row => {
      const contact = contactByEmail.get(row.email)
      return {
        email: row.email,
        firstName: contact?.first_name || row.first_name,
        isPromptLead: true,
        isVaultBuyer: row.is_vault_buyer,
        isInternalOrTest: row.is_internal_or_test,
        unsubscribed: contact?.unsubscribed ?? true,
        blockedDelivery: row.blocked_delivery || !contact,
        receivedRecentVaultOffer: row.received_recent_vault_offer,
      }
    })
  )
  return { mainContacts, candidateRows, result }
}

async function mutateSegmentMembership(input: {
  resend: Resend
  action: "add" | "remove"
  contactId: string
  segmentId: string
}) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const response = input.action === "add"
      ? await input.resend.contacts.segments.add({ contactId: input.contactId, segmentId: input.segmentId })
      : await input.resend.contacts.segments.remove({ contactId: input.contactId, segmentId: input.segmentId })
    const message = String(response.error?.message || "")
    if (!response.error || /already|exists|not found|404|409/i.test(message)) return
    if (!/429|rate|too many/i.test(message) || attempt === 6) {
      throw new Error(`segment ${input.action}: ${message || "unknown error"}`)
    }
    await sleep(Math.min(10_000, 800 * 2 ** (attempt - 1)))
  }
}

async function runMembershipBatches(input: {
  resend: Resend
  action: "add" | "remove"
  contacts: Contact[]
  segmentId: string
}) {
  let completed = 0
  for (let offset = 0; offset < input.contacts.length; offset += CONTACT_BATCH_SIZE) {
    const startedAt = Date.now()
    const batch = input.contacts.slice(offset, offset + CONTACT_BATCH_SIZE)
    await Promise.all(batch.map(contact => mutateSegmentMembership({
      resend: input.resend,
      action: input.action,
      contactId: contact.id,
      segmentId: input.segmentId,
    })))
    completed += batch.length
    if (completed % 100 === 0 || completed === input.contacts.length) {
      console.log(`[prompt-vault-proof] ${input.action}: ${completed}/${input.contacts.length}`)
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
  mainContacts: Contact[]
  desiredEmails: Set<string>
}) {
  const segmentContacts = await listAllContacts(input.resend, input.segment.id)
  const mainByEmail = new Map(input.mainContacts.map(contact => [contact.email.trim().toLowerCase(), contact]))
  const segmentByEmail = new Map(segmentContacts.map(contact => [contact.email.trim().toLowerCase(), contact]))
  const toAdd = [...input.desiredEmails]
    .filter(email => !segmentByEmail.has(email))
    .flatMap(email => mainByEmail.get(email) || [])
  const toRemove = segmentContacts.filter(contact => !input.desiredEmails.has(contact.email.trim().toLowerCase()))

  console.log("[prompt-vault-proof] segment reconciliation", {
    desired: input.desiredEmails.size,
    existing: segmentByEmail.size,
    toAdd: toAdd.length,
    toRemove: toRemove.length,
  })
  await runMembershipBatches({ resend: input.resend, action: "remove", contacts: toRemove, segmentId: input.segment.id })
  await runMembershipBatches({ resend: input.resend, action: "add", contacts: toAdd, segmentId: input.segment.id })

  const finalContacts = (await listAllContacts(input.resend, input.segment.id)).filter(contact => !contact.unsubscribed)
  const finalEmails = new Set(finalContacts.map(contact => contact.email.trim().toLowerCase()))
  const missing = [...input.desiredEmails].filter(email => !finalEmails.has(email)).length
  const extra = [...finalEmails].filter(email => !input.desiredEmails.has(email)).length
  if (missing || extra || finalEmails.size !== input.desiredEmails.size) {
    throw new Error(`segment mismatch: desired=${input.desiredEmails.size}, final=${finalEmails.size}, missing=${missing}, extra=${extra}`)
  }
  return finalEmails.size
}

function compliantHtml(html: string) {
  return `${html}\n${EMAIL_CONFIG.compliance.unsubscribeHtml}\n${EMAIL_CONFIG.compliance.addressHtml}`
}

function compliantText(text: string) {
  return `${text}\n\n${EMAIL_CONFIG.compliance.unsubscribeText}\n${EMAIL_CONFIG.compliance.addressText}`
}

async function createOrUpdateDraft(resend: Resend, segmentId: string) {
  const listed = await withRetry("broadcasts.list", () => resend.broadcasts.list({ limit: 100 }))
  const existing = (listed?.data || []).find(broadcast => broadcast.name === CAMPAIGN_KEY)
  const email = generatePromptVaultProofRecoveryEmail({ firstName: MERGE_FIRST_NAME })
  const payload = {
    segmentId,
    from: FROM,
    replyTo: [REPLY_TO],
    name: CAMPAIGN_KEY,
    subject: email.subject,
    html: compliantHtml(email.html),
    text: compliantText(email.text),
  }

  if (existing) {
    if (existing.status !== "draft") throw new Error(`existing broadcast is ${existing.status}, not draft`)
    await withRetry("broadcasts.update", () => resend.broadcasts.update(existing.id, payload))
    return { id: existing.id, action: "updated" }
  }
  const created = await withRetry("broadcasts.create", () => resend.broadcasts.create(payload))
  if (!created?.id) throw new Error("Resend did not return a broadcast id")
  return { id: created.id, action: "created" }
}

async function main() {
  const prepare = process.argv.includes("--prepare")
  if (prepare && process.env.PROMPT_VAULT_PROOF_RECOVERY_PREPARE_APPROVED !== "1") {
    throw new Error("PROMPT_VAULT_PROOF_RECOVERY_PREPARE_APPROVED=1 is required for preparation")
  }

  const resend = new Resend(requiredEnv("RESEND_API_KEY"))
  const sql = neon(requiredEnv("DATABASE_URL"))
  const snapshot = await buildSnapshot(resend, sql)
  console.log("[prompt-vault-proof] audience audit", {
    mainContacts: snapshot.mainContacts.length,
    recentPromptLeads: snapshot.candidateRows.length,
    eligible: snapshot.result.eligible.length,
    excluded: snapshot.result.excluded,
  })
  if (!prepare) {
    console.log("[prompt-vault-proof] audit only; no segment or draft changed")
    return
  }

  const segment = await getOrCreateSegment(resend)
  const desiredEmails = new Set(snapshot.result.eligible.map(contact => contact.email))
  const finalCount = await reconcileSegment({
    resend,
    segment,
    mainContacts: snapshot.mainContacts,
    desiredEmails,
  })
  const draft = await createOrUpdateDraft(resend, segment.id)
  console.log("[prompt-vault-proof] ready for Sandra review", {
    segmentId: segment.id,
    recipients: finalCount,
    broadcastId: draft.id,
    draftAction: draft.action,
    sent: false,
  })
}

main().catch(error => {
  console.error("[prompt-vault-proof] failed:", error instanceof Error ? error.message : error)
  process.exitCode = 1
})
