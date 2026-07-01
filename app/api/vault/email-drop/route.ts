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
// 4. Must have ≥2 valid selected/pending collections. The shared admin workflow
//    prefers DB-published Shoot Studio drops, so one new shoot cannot be mixed
//    with old static collections by accident.
//
// ── FLOW ──────────────────────────────────────────────────────────────────
// 1. POST here (dryRun: true)  → review counts
// 2. POST here (dryRun: false) → get runId
// 3. POST /process repeatedly  → send batches of 25
// 4. GET  /status?runId=...    → check progress
// 5. After completion: update drop-log.ts + reset flags

import { NextResponse } from "next/server"
import {
  createVaultDropLiveRun,
  getVaultDropEmailPreview,
  selectedVaultDropIdsFromInput,
} from "@/lib/admin/vault-drop-email-workflow"
import {
  VAULT_EMAIL_CONFIG,
} from "@/lib/vault/drop-log"

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

  const body = await request.json().catch(() => ({}))
  const selectedIds = selectedVaultDropIdsFromInput((body as { collectionIds?: unknown }).collectionIds)
  const preview = await getVaultDropEmailPreview(selectedIds)

  // 3. Pending collections check. This deliberately uses the same selector as
  // admin preview/test-send so live runs cannot drift from what Sandra reviewed.
  if (!preview.ready) {
    return NextResponse.json(
      {
        error: "A drop needs at least 2 valid pending collections.",
        pendingCount: preview.collections.length,
        selectedCollectionIds: preview.selectedCollectionIds,
        missingCollectionIds: preview.missingCollectionIds,
        availableCollections: preview.availableCollections,
        hint: "Select two queued Shoot Studio collections from the admin preview before creating a live run.",
      },
      { status: 422 },
    )
  }

  const isDryRun = VAULT_EMAIL_CONFIG.dryRun

  // ── Dry run response ─────────────────────────────────────────────────────

  if (isDryRun) {
    return NextResponse.json({
      dryRun: true,
      dropKey: preview.dropKey,
      idempotencyKeys: preview.idempotencyKeys,
      selectedCollectionIds: preview.selectedCollectionIds,
      newCollections: preview.collections.map((c) => ({
        id: c.id,
        name: c.name,
        heroImage: c.heroImage,
      })),
      segments: {
        nonBuyers: {
          count: preview.segments.nonbuyers.count,
          sampleRecipients: preview.segments.nonbuyers.sampleRecipients,
          subjectPreview: preview.previews.nonbuyer.subject,
          collectionImageCount: preview.collections.length,
          segmentRule:
            "source='ai-prompts' OR tag 'ai-prompts-subscriber' OR tag 'ai-photoshoot-audience', excluding prompt-vault-paid",
        },
        buyers: {
          count: preview.segments.buyers.count,
          sampleRecipients: preview.segments.buyers.sampleRecipients,
          subjectPreview: preview.previews.buyer.subject,
          collectionImageCount: preview.collections.length,
          segmentRule: "source='prompt-vault-paid' OR tag 'prompt-vault-paid', with valid access_token",
        },
      },
      totalRecipients: preview.totalRecipients,
      note: "Dry run complete. No run created, no emails sent. Set dryRun: false in lib/vault/drop-log.ts and call this endpoint again to create a live run.",
    })
  }

  // ── Live run: create run record, return runId ────────────────────────────

  const result = await createVaultDropLiveRun(preview.selectedCollectionIds)
  if (!result.success) {
    return NextResponse.json(result, { status: "status" in result ? result.status ?? 500 : 500 })
  }

  if (!result.run) {
    return NextResponse.json({ success: false, error: "Live run was created but could not be reloaded." }, { status: 500 })
  }

  const runId = result.run.id
  console.log(`[vault/email-drop] Run ready: ${runId}`, {
    dropKey: preview.dropKey,
    existing: "existing" in result ? result.existing : false,
    totalRecipients: preview.totalRecipients,
  })

  return NextResponse.json({
    dryRun: false,
    runId,
    existing: "existing" in result ? result.existing : false,
    dropKey: preview.dropKey,
    idempotencyKeys: preview.idempotencyKeys,
    selectedCollectionIds: preview.selectedCollectionIds,
    newCollections: preview.collections.map((c) => ({ id: c.id, name: c.name })),
    segments: {
      nonBuyers: {
        totalPending: preview.segments.nonbuyers.count,
        collectionImageCount: preview.collections.length,
      },
      buyers: {
        totalPending: preview.segments.buyers.count,
        collectionImageCount: preview.collections.length,
      },
    },
    totalRecipients: preview.totalRecipients,
    nextSteps: [
      `1. Send non-buyer batch: POST /api/vault/email-drop/process  body: { "runId": "${runId}", "audienceType": "non_buyer" }`,
      `2. Repeat step 1 until response.done.nonBuyer === true`,
      `3. Send buyer batch:     POST /api/vault/email-drop/process  body: { "runId": "${runId}", "audienceType": "buyer" }`,
      `4. Check progress:       GET  /api/vault/email-drop/status?runId=${runId}`,
      `5. After all done: update lib/vault/drop-log.ts - set includedInEmailDrop: true + droppedAt, reset automationApproved: false`,
    ],
  })
}
