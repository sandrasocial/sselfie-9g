// POST /api/vault/email-drop/process
//
// Processes one batch of up to 25 recipients for a vault drop run.
// Call this repeatedly until response.done is true for both segments.
//
// ── IDEMPOTENCY ───────────────────────────────────────────────────────────
// Before sending to any address, this route checks email_logs for a record
// with matching (user_email, email_type, status IN ('sent','delivered','suppressed')).
// If found: skip (do not send again).
// The email_type is derived from the run's drop_key:
//   vault_drop_{dropKey}_nonbuyer  (non-buyers)
//   vault_drop_{dropKey}_buyer     (buyers)
//
// This means:
//   - Calling /process twice with the same runId is safe — duplicates are skipped
//   - A completely separate run for the same collections is also safe
//   - Only 'failed' records are eligible for retry (no 'sent' guard)
//
// ── REQUEST ───────────────────────────────────────────────────────────────
//   POST /api/vault/email-drop/process
//   Authorization: Bearer <VAULT_EMAIL_DROP_SECRET>
//   Content-Type: application/json
//   Body: {
//     "runId": "uuid",
//     "audienceType": "non_buyer" | "buyer" | "all",   // default: "all"
//     "batchSize": 25                                   // optional override, max 50
//   }
//
// ── RESPONSE ──────────────────────────────────────────────────────────────
//   {
//     "runId": "uuid",
//     "batchSent": { "nonBuyer": 12, "buyer": 5 },
//     "batchFailed": { "nonBuyer": 0, "buyer": 0 },
//     "batchSkipped": { "nonBuyer": 0, "buyer": 0 },
//     "done": { "nonBuyer": false, "buyer": true },
//     "progress": {
//       "nonBuyer": { "sent": 12, "total": 1507, "pct": 1 },
//       "buyer": { "sent": 5, "total": 5, "pct": 100 }
//     }
//   }
//
// When done.nonBuyer AND done.buyer are both true → drop is complete.
// Run status in vault_drop_runs will be updated to 'completed' or 'partially_completed'.

import { NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/send-email"
import { EMAIL_CONFIG } from "@/lib/email/config"
import {
  VAULT_EMAIL_CONFIG,
  getPendingCollections,
  buildDropKey,
  buildDropEmailType,
} from "@/lib/vault/drop-log"
import { generateVaultDropNonbuyerEmail } from "@/lib/email/templates/vault-drop-nonbuyer"
import { generateVaultDropBuyerEmail } from "@/lib/email/templates/vault-drop-buyer"

// ── Types ──────────────────────────────────────────────────────────────────

type AudienceType = "non_buyer" | "buyer" | "all"

type DropRunRow = {
  id: string
  drop_key: string
  collection_slugs: string[]
  is_dry_run: boolean
  status: string
  non_buyer_total: number
  non_buyer_sent: number
  non_buyer_failed: number
  non_buyer_skipped: number
  buyer_total: number
  buyer_sent: number
  buyer_failed: number
  buyer_skipped: number
}

type SubscriberRow = {
  email: string
  name: string | null
  access_token: string | null
}

// ── Auth ───────────────────────────────────────────────────────────────────

function isAuthorized(request: Request): boolean {
  const secret = process.env.VAULT_EMAIL_DROP_SECRET
  if (!secret) return false
  const auth = request.headers.get("Authorization") ?? ""
  return auth === `Bearer ${secret}`
}

// ── Segment queries — only pending (not yet sent) recipients ───────────────

async function fetchPendingNonBuyers(
  dropEmailType: string,
  batchSize: number,
  testEmail?: string,
): Promise<SubscriberRow[]> {
  if (testEmail) {
    // In test mode: only target the specified email, skip all real recipients
    const rows = await sql`
      SELECT DISTINCT ON (LOWER(fs.email))
        fs.email,
        NULLIF(BTRIM(fs.name), '') AS name,
        fs.access_token
      FROM freebie_subscribers fs
      WHERE LOWER(fs.email) = LOWER(${testEmail})
        AND NOT EXISTS (
          SELECT 1 FROM email_logs el
          WHERE LOWER(el.user_email) = LOWER(fs.email)
            AND el.email_type = ${dropEmailType}
            AND el.status IN ('sent', 'delivered', 'suppressed')
        )
      LIMIT 1
    `
    return rows as SubscriberRow[]
  }

  const rows = await sql`
    SELECT DISTINCT ON (LOWER(fs.email))
      fs.email,
      NULLIF(BTRIM(fs.name), '') AS name,
      fs.access_token
    FROM freebie_subscribers fs
    WHERE fs.email IS NOT NULL
      AND fs.email <> ''
      AND (
        fs.source = 'ai-prompts'
        OR 'ai-prompts-subscriber' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
        OR 'ai-photoshoot-audience' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
      )
      AND NOT (
        fs.source = 'prompt-vault-paid'
        OR 'prompt-vault-paid' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
      )
      AND NOT EXISTS (
        SELECT 1 FROM email_logs el
        WHERE LOWER(el.user_email) = LOWER(fs.email)
          AND el.email_type = ${dropEmailType}
          AND el.status IN ('sent', 'delivered', 'suppressed')
      )
    ORDER BY LOWER(fs.email)
    LIMIT ${batchSize}
  `
  return rows as SubscriberRow[]
}

async function fetchPendingBuyers(
  dropEmailType: string,
  batchSize: number,
  testEmail?: string,
): Promise<SubscriberRow[]> {
  if (testEmail) {
    const rows = await sql`
      SELECT DISTINCT ON (LOWER(fs.email))
        fs.email,
        NULLIF(BTRIM(fs.name), '') AS name,
        fs.access_token
      FROM freebie_subscribers fs
      WHERE LOWER(fs.email) = LOWER(${testEmail})
        AND fs.access_token IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM email_logs el
          WHERE LOWER(el.user_email) = LOWER(fs.email)
            AND el.email_type = ${dropEmailType}
            AND el.status IN ('sent', 'delivered', 'suppressed')
        )
      LIMIT 1
    `
    return rows as SubscriberRow[]
  }

  const rows = await sql`
    SELECT DISTINCT ON (LOWER(fs.email))
      fs.email,
      NULLIF(BTRIM(fs.name), '') AS name,
      fs.access_token
    FROM freebie_subscribers fs
    WHERE fs.email IS NOT NULL
      AND fs.email <> ''
      AND (
        fs.source = 'prompt-vault-paid'
        OR 'prompt-vault-paid' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
      )
      AND fs.access_token IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM email_logs el
        WHERE LOWER(el.user_email) = LOWER(fs.email)
          AND el.email_type = ${dropEmailType}
          AND el.status IN ('sent', 'delivered', 'suppressed')
      )
    ORDER BY LOWER(fs.email)
    LIMIT ${batchSize}
  `
  return rows as SubscriberRow[]
}

// ── Send helpers ───────────────────────────────────────────────────────────

type BatchResult = { sent: number; failed: number; skipped: number }

async function processBatch(
  subscribers: SubscriberRow[],
  audience: "nonbuyer" | "buyer",
  run: DropRunRow,
  dropEmailType: string,
): Promise<BatchResult> {
  const result: BatchResult = { sent: 0, failed: 0, skipped: 0 }

  const pendingCollections = getPendingCollections()
  const dropLabel = VAULT_EMAIL_CONFIG.dropLabel

  for (const subscriber of subscribers) {
    const firstName = subscriber.name?.split(" ")[0]?.trim() || "friend"

    let emailPayload: { subject: string; html: string; text: string }

    if (audience === "nonbuyer") {
      emailPayload = generateVaultDropNonbuyerEmail({
        firstName,
        newCollections: pendingCollections,
        dropLabel,
      })
    } else {
      if (!subscriber.access_token) {
        console.warn(
          `[vault/process] buyer ${subscriber.email} has no access_token — skipping`,
        )
        result.skipped++
        continue
      }
      emailPayload = generateVaultDropBuyerEmail({
        firstName,
        accessToken: subscriber.access_token,
        newCollections: pendingCollections,
      })
    }

    try {
      const sendResult = await sendEmail({
        to: subscriber.email,
        subject: emailPayload.subject,
        html: emailPayload.html,
        text: emailPayload.text,
        from: EMAIL_CONFIG.marketing.from,
        emailType: dropEmailType,
        marketing: true,
        tags: [`vault-drop-${run.drop_key}`, `vault-${audience}`],
      })

      if (sendResult.success) {
        result.sent++
      } else if (
        sendResult.error?.includes("Suppressed") ||
        sendResult.error?.includes("suppressed") ||
        sendResult.error?.includes("unsubscribed") ||
        sendResult.error?.includes("complained") ||
        sendResult.error?.includes("bounced")
      ) {
        // Suppressed by marketing rules — counts as intentionally skipped
        result.skipped++
      } else {
        result.failed++
        console.warn(
          `[vault/process] send failed for ${subscriber.email}: ${sendResult.error}`,
        )
      }
    } catch (err) {
      result.failed++
      console.error(`[vault/process] unexpected error for ${subscriber.email}:`, err)
    }
  }

  return result
}

// ── Update run counters ────────────────────────────────────────────────────

async function updateRunCounters(
  runId: string,
  audience: "nonbuyer" | "buyer",
  delta: BatchResult,
): Promise<void> {
  if (audience === "nonbuyer") {
    await sql`
      UPDATE vault_drop_runs
      SET
        non_buyer_sent    = non_buyer_sent    + ${delta.sent},
        non_buyer_failed  = non_buyer_failed  + ${delta.failed},
        non_buyer_skipped = non_buyer_skipped + ${delta.skipped},
        status            = 'processing',
        started_at        = COALESCE(started_at, NOW())
      WHERE id = ${runId}
    `
  } else {
    await sql`
      UPDATE vault_drop_runs
      SET
        buyer_sent    = buyer_sent    + ${delta.sent},
        buyer_failed  = buyer_failed  + ${delta.failed},
        buyer_skipped = buyer_skipped + ${delta.skipped},
        status        = 'processing',
        started_at    = COALESCE(started_at, NOW())
      WHERE id = ${runId}
    `
  }
}

// ── Finalize run if both segments complete ─────────────────────────────────

async function maybeCompleteRun(
  runId: string,
  run: DropRunRow,
  nonBuyerDone: boolean,
  buyerDone: boolean,
): Promise<string | null> {
  if (!nonBuyerDone || !buyerDone) return null

  // Reload run to get final counters
  const updated = await sql`SELECT * FROM vault_drop_runs WHERE id = ${runId}`
  const r = updated[0] as DropRunRow | undefined
  if (!r) return null

  const hasFailures = r.non_buyer_failed > 0 || r.buyer_failed > 0
  const newStatus = hasFailures ? "partially_completed" : "completed"

  await sql`
    UPDATE vault_drop_runs
    SET status = ${newStatus}, completed_at = NOW()
    WHERE id = ${runId}
  `

  return newStatus
}

// ── Route ──────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // 1. Auth
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 2. Parse body
  let body: {
    runId?: string
    audienceType?: AudienceType
    batchSize?: number
    testRecipientEmail?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { runId, audienceType = "all", testRecipientEmail } = body
  const batchSize = Math.min(
    Math.max(1, body.batchSize ?? VAULT_EMAIL_CONFIG.maxBatchSize),
    50, // hard cap at 50 regardless of config
  )

  if (!runId) {
    return NextResponse.json(
      { error: "runId is required. Create a run first: POST /api/vault/email-drop" },
      { status: 400 },
    )
  }

  // 3. Load run
  const runRows = await sql`SELECT * FROM vault_drop_runs WHERE id = ${runId}`
  const run = runRows[0] as DropRunRow | undefined

  if (!run) {
    return NextResponse.json(
      { error: `Run not found: ${runId}. Create one via POST /api/vault/email-drop.` },
      { status: 404 },
    )
  }

  if (run.is_dry_run) {
    return NextResponse.json(
      { error: "This run was created in dry-run mode. Create a live run first." },
      { status: 400 },
    )
  }

  if (run.status === "completed") {
    return NextResponse.json(
      {
        error: "Run is already completed.",
        run: {
          id: run.id,
          dropKey: run.drop_key,
          status: run.status,
          nonBuyer: {
            sent: run.non_buyer_sent,
            total: run.non_buyer_total,
          },
          buyer: {
            sent: run.buyer_sent,
            total: run.buyer_total,
          },
        },
      },
      { status: 409 },
    )
  }

  // 4. Derive email types from drop_key stored in the run
  const nonbuyerEmailType = buildDropEmailType(run.drop_key, "nonbuyer")
  const buyerEmailType = buildDropEmailType(run.drop_key, "buyer")

  // Verify drop-log still matches (safety check)
  const pendingCollections = getPendingCollections()
  const currentDropKey = buildDropKey(pendingCollections)
  if (currentDropKey !== run.drop_key) {
    return NextResponse.json(
      {
        error: "Drop key mismatch.",
        runDropKey: run.drop_key,
        currentDropKey,
        hint: "The pending collections in drop-log.ts have changed since this run was created. Check if some collections were marked includedInEmailDrop:true prematurely.",
      },
      { status: 409 },
    )
  }

  // 5. Process non-buyer batch
  const batchSent = { nonBuyer: 0, buyer: 0 }
  const batchFailed = { nonBuyer: 0, buyer: 0 }
  const batchSkipped = { nonBuyer: 0, buyer: 0 }

  if (audienceType === "non_buyer" || audienceType === "all") {
    const subscribers = await fetchPendingNonBuyers(
      nonbuyerEmailType,
      batchSize,
      testRecipientEmail,
    )

    if (subscribers.length > 0) {
      const result = await processBatch(subscribers, "nonbuyer", run, nonbuyerEmailType)
      batchSent.nonBuyer = result.sent
      batchFailed.nonBuyer = result.failed
      batchSkipped.nonBuyer = result.skipped

      await updateRunCounters(runId, "nonbuyer", result)

      console.log(`[vault/process] non-buyer batch: sent=${result.sent} failed=${result.failed} skipped=${result.skipped}`)
    }
  }

  // 6. Process buyer batch
  if (audienceType === "buyer" || audienceType === "all") {
    const subscribers = await fetchPendingBuyers(
      buyerEmailType,
      batchSize,
      testRecipientEmail,
    )

    if (subscribers.length > 0) {
      const result = await processBatch(subscribers, "buyer", run, buyerEmailType)
      batchSent.buyer = result.sent
      batchFailed.buyer = result.failed
      batchSkipped.buyer = result.skipped

      await updateRunCounters(runId, "buyer", result)

      console.log(`[vault/process] buyer batch: sent=${result.sent} failed=${result.failed} skipped=${result.skipped}`)
    }
  }

  // 7. Check if any work remains
  const [nbRemaining, bRemaining] = await Promise.all([
    fetchPendingNonBuyers(nonbuyerEmailType, 1, testRecipientEmail),
    fetchPendingBuyers(buyerEmailType, 1, testRecipientEmail),
  ])

  const nonBuyerDone = nbRemaining.length === 0
  const buyerDone = bRemaining.length === 0

  // 8. Finalise run if both segments done
  let finalStatus: string | null = null
  if (nonBuyerDone && buyerDone) {
    finalStatus = await maybeCompleteRun(runId, run, nonBuyerDone, buyerDone)
  }

  // 9. Reload run for updated counters
  const refreshed = (await sql`SELECT * FROM vault_drop_runs WHERE id = ${runId}`)[0] as DropRunRow

  return NextResponse.json({
    runId,
    dropKey: run.drop_key,
    batchSent,
    batchFailed,
    batchSkipped,
    done: {
      nonBuyer: nonBuyerDone,
      buyer: buyerDone,
      all: nonBuyerDone && buyerDone,
    },
    progress: {
      nonBuyer: {
        sent: refreshed.non_buyer_sent,
        failed: refreshed.non_buyer_failed,
        skipped: refreshed.non_buyer_skipped,
        total: refreshed.non_buyer_total,
        pct: refreshed.non_buyer_total > 0
          ? Math.round((refreshed.non_buyer_sent / refreshed.non_buyer_total) * 100)
          : 100,
      },
      buyer: {
        sent: refreshed.buyer_sent,
        failed: refreshed.buyer_failed,
        skipped: refreshed.buyer_skipped,
        total: refreshed.buyer_total,
        pct: refreshed.buyer_total > 0
          ? Math.round((refreshed.buyer_sent / refreshed.buyer_total) * 100)
          : 100,
      },
    },
    runStatus: finalStatus ?? refreshed.status,
    nextStep:
      nonBuyerDone && buyerDone
        ? "Drop complete. Update lib/vault/drop-log.ts: set includedInEmailDrop:true + droppedAt for each collection, then reset automationApproved:false and dryRun:true."
        : "Call this endpoint again with the same runId to process the next batch.",
  })
}
