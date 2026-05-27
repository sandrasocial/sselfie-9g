// POST /api/vault/email-drop
//
// Dry-run preview OR live run creation (does NOT send emails itself).
// Sending happens in /process called separately in batches.
//
// ── SAFETY GATES ──────────────────────────────────────────────────────────
// 1. Requires `Authorization: Bearer <VAULT_EMAIL_DROP_SECRET>` header.
//    Set VAULT_EMAIL_DROP_SECRET in Vercel env. Strong random value.
// 2. VAULT_EMAIL_CONFIG.automationApproved must be `true`.
// 3. VAULT_EMAIL_CONFIG.dryRun = true  → preview only, no run created.
//    VAULT_EMAIL_CONFIG.dryRun = false → creates vault_drop_runs record,
//    returns runId. No emails sent until /process is called.
// 4. Must have ≥2 collections with includedInEmailDrop: false.
//
// ── MIGRATION REQUIRED ────────────────────────────────────────────────────
// Run migrations/20260527_vault_drop_runs.sql before using this endpoint.
//
// ── FLOW ──────────────────────────────────────────────────────────────────
// 1. POST here (dryRun: true)  → review counts
// 2. POST here (dryRun: false) → get runId
// 3. POST /process repeatedly  → send batches of 25
// 4. GET  /status?runId=...    → check progress
// 5. After completion: update drop-log.ts + reset flags

import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import {
  VAULT_EMAIL_CONFIG,
  getPendingCollections,
  isEmailDropReady,
  buildDropKey,
  buildDropEmailType,
} from "@/lib/vault/drop-log"
import { generateVaultDropNonbuyerEmail } from "@/lib/email/templates/vault-drop-nonbuyer"
import { generateVaultDropBuyerEmail } from "@/lib/email/templates/vault-drop-buyer"

// ── Auth ───────────────────────────────────────────────────────────────────

function isAuthorized(request: Request): boolean {
  const secret = process.env.VAULT_EMAIL_DROP_SECRET
  if (!secret) {
    console.error("[vault/email-drop] VAULT_EMAIL_DROP_SECRET env var is not set")
    return false
  }
  const auth = request.headers.get("Authorization") ?? ""
  return auth === `Bearer ${secret}`
}

// ── Segment counts (no emails sent, just counts for dry-run) ───────────────

type SubscriberPreview = { email: string; name: string | null }

async function countAndPreviewNonBuyers(
  dropEmailType: string,
): Promise<{ count: number; sample: SubscriberPreview[] }> {
  const rows = await sql`
    SELECT DISTINCT ON (LOWER(fs.email))
      LOWER(BTRIM(fs.email)) AS email,
      NULLIF(BTRIM(fs.name), '') AS name
    FROM freebie_subscribers fs
    WHERE fs.email IS NOT NULL
      AND fs.email <> ''
      AND LOWER(BTRIM(fs.email)) ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
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
  `

  const all = rows as SubscriberPreview[]
  return {
    count: all.length,
    sample: all.slice(0, 5),
  }
}

async function countAndPreviewBuyers(
  dropEmailType: string,
): Promise<{ count: number; sample: SubscriberPreview[] }> {
  const rows = await sql`
    SELECT DISTINCT ON (LOWER(fs.email))
      LOWER(BTRIM(fs.email)) AS email,
      NULLIF(BTRIM(fs.name), '') AS name
    FROM freebie_subscribers fs
    WHERE fs.email IS NOT NULL
      AND fs.email <> ''
      AND LOWER(BTRIM(fs.email)) ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
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
  `

  const all = rows as SubscriberPreview[]
  return {
    count: all.length,
    sample: all.slice(0, 5),
  }
}

// ── Route ──────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // 1. Auth
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        error: "Unauthorized.",
        hint: "Provide 'Authorization: Bearer <VAULT_EMAIL_DROP_SECRET>' header. Ensure VAULT_EMAIL_DROP_SECRET is set in Vercel env.",
      },
      { status: 401 },
    )
  }

  // 2. Automation gate
  if (!VAULT_EMAIL_CONFIG.automationApproved) {
    return NextResponse.json(
      {
        error: "Automation not approved.",
        hint: "Set automationApproved: true in lib/vault/drop-log.ts to enable.",
      },
      { status: 403 },
    )
  }

  // 3. Pending collections check
  if (!isEmailDropReady()) {
    const pending = getPendingCollections()
    return NextResponse.json(
      {
        error: "Not enough new collections for a drop.",
        pendingCount: pending.length,
        hint: "A drop requires ≥2 collections with includedInEmailDrop: false in lib/vault/drop-log.ts.",
      },
      { status: 422 },
    )
  }

  const newCollections = getPendingCollections()
  const dropKey = buildDropKey(newCollections)
  const nonbuyerEmailType = buildDropEmailType(dropKey, "nonbuyer")
  const buyerEmailType = buildDropEmailType(dropKey, "buyer")
  const isDryRun = VAULT_EMAIL_CONFIG.dryRun

  // 4. Count segments
  let nonBuyerResult: Awaited<ReturnType<typeof countAndPreviewNonBuyers>>
  let buyerResult: Awaited<ReturnType<typeof countAndPreviewBuyers>>

  try {
    ;[nonBuyerResult, buyerResult] = await Promise.all([
      countAndPreviewNonBuyers(nonbuyerEmailType),
      countAndPreviewBuyers(buyerEmailType),
    ])
  } catch (err) {
    console.error("[vault/email-drop] DB segment count failed:", err)
    return NextResponse.json({ error: "Database error counting segments" }, { status: 500 })
  }

  // Generate subject previews
  const sampleNonBuyer = nonBuyerResult.sample[0]
  const sampleBuyer = buyerResult.sample[0]

  const nonbuyerSubject = sampleNonBuyer
    ? generateVaultDropNonbuyerEmail({
        firstName: sampleNonBuyer.name?.split(" ")[0] || "friend",
        newCollections,
      }).subject
    : null

  const buyerSubject = sampleBuyer
    ? generateVaultDropBuyerEmail({
        firstName: sampleBuyer.name?.split(" ")[0] || "friend",
        accessToken: "PREVIEW_TOKEN",
        newCollections,
      }).subject
    : null

  // ── Dry run response ─────────────────────────────────────────────────────

  if (isDryRun) {
    return NextResponse.json({
      dryRun: true,
      dropKey,
      idempotencyKeys: {
        nonBuyer: nonbuyerEmailType,
        buyer: buyerEmailType,
      },
      newCollections: newCollections.map((c) => ({
        id: c.id,
        name: c.name,
        heroImage: c.heroImage,
      })),
      segments: {
        nonBuyers: {
          count: nonBuyerResult.count,
          sampleRecipients: nonBuyerResult.sample,
          subjectPreview: nonbuyerSubject,
          segmentRule:
            "source='ai-prompts' OR tag 'ai-prompts-subscriber' OR tag 'ai-photoshoot-audience', excluding prompt-vault-paid",
        },
        buyers: {
          count: buyerResult.count,
          sampleRecipients: buyerResult.sample,
          subjectPreview: buyerSubject,
          segmentRule: "source='prompt-vault-paid' OR tag 'prompt-vault-paid', with valid access_token",
        },
      },
      totalRecipients: nonBuyerResult.count + buyerResult.count,
      note: "Dry run complete. No run created, no emails sent. Set dryRun: false in lib/vault/drop-log.ts and call this endpoint again to create a live run.",
    })
  }

  // ── Live run: create run record, return runId ────────────────────────────

  const runId = randomUUID()

  try {
    await sql`
      INSERT INTO vault_drop_runs (
        id,
        drop_key,
        collection_slugs,
        is_dry_run,
        status,
        non_buyer_total,
        buyer_total,
        created_at
      ) VALUES (
        ${runId},
        ${dropKey},
        ${newCollections.map((c) => c.id)},
        false,
        'pending',
        ${nonBuyerResult.count},
        ${buyerResult.count},
        NOW()
      )
    `
  } catch (err) {
    console.error("[vault/email-drop] Failed to create run record:", err)
    return NextResponse.json(
      {
        error: "Failed to create drop run record. Ensure migration 20260527_vault_drop_runs.sql has been applied.",
      },
      { status: 500 },
    )
  }

  console.log(`[vault/email-drop] Run created: ${runId}`, {
    dropKey,
    nonBuyerTotal: nonBuyerResult.count,
    buyerTotal: buyerResult.count,
  })

  return NextResponse.json({
    dryRun: false,
    runId,
    dropKey,
    idempotencyKeys: {
      nonBuyer: nonbuyerEmailType,
      buyer: buyerEmailType,
    },
    newCollections: newCollections.map((c) => ({ id: c.id, name: c.name })),
    segments: {
      nonBuyers: { totalPending: nonBuyerResult.count },
      buyers: { totalPending: buyerResult.count },
    },
    totalRecipients: nonBuyerResult.count + buyerResult.count,
    nextSteps: [
      `1. Send non-buyer batch: POST /api/vault/email-drop/process  body: { "runId": "${runId}", "audienceType": "non_buyer" }`,
      `2. Repeat step 1 until response.done.nonBuyer === true`,
      `3. Send buyer batch:     POST /api/vault/email-drop/process  body: { "runId": "${runId}", "audienceType": "buyer" }`,
      `4. Check progress:       GET  /api/vault/email-drop/status?runId=${runId}`,
      `5. After all done: update lib/vault/drop-log.ts — set includedInEmailDrop: true + droppedAt, reset automationApproved: false`,
    ],
  })
}
