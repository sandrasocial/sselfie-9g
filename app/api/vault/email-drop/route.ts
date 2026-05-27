// POST /api/vault/email-drop
//
// Triggers the vault email re-engagement drop.
//   · Non-buyers (freebie subscribers) → upsell email → /prompt-vault
//   · Buyers (vault owners)            → update email → their personal vault URL
//
// SAFETY GATES:
//   1. VAULT_EMAIL_CONFIG.automationApproved must be `true` in lib/vault/drop-log.ts
//   2. Requires `Authorization: Bearer <VAULT_EMAIL_DROP_SECRET>` header
//      (set VAULT_EMAIL_DROP_SECRET in Vercel env — use a strong random value)
//   3. Must have at least 2 new collections pending (not yet included in a drop)
//
// DRY-RUN MODE:
//   When VAULT_EMAIL_CONFIG.dryRun is `true`, the route returns a full preview
//   report (recipients, subject lines, collection list) without sending anything.
//
// After a successful real send, manually update lib/vault/drop-log.ts:
//   · Set each sent collection's `includedInEmailDrop: true` and `droppedAt` to today
//   · Set `automationApproved: false` so the system is safe at rest

import { NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/send-email"
import { EMAIL_CONFIG } from "@/lib/email/config"
import {
  VAULT_EMAIL_CONFIG,
  getPendingCollections,
  isEmailDropReady,
} from "@/lib/vault/drop-log"
import { generateVaultDropNonbuyerEmail } from "@/lib/email/templates/vault-drop-nonbuyer"
import { generateVaultDropBuyerEmail } from "@/lib/email/templates/vault-drop-buyer"

// ── Type: raw DB row from freebie_subscribers ──────────────────────────────

type SubscriberRow = {
  email: string
  name: string | null
  access_token: string | null
  source: string | null
  email_tags: string[] | null
}

// ── Auth check ─────────────────────────────────────────────────────────────

function isAuthorized(request: Request): boolean {
  const secret = process.env.VAULT_EMAIL_DROP_SECRET
  if (!secret) return false
  const auth = request.headers.get("Authorization") ?? ""
  return auth === `Bearer ${secret}`
}

// ── Segment queries ────────────────────────────────────────────────────────

async function fetchNonBuyers(): Promise<SubscriberRow[]> {
  // Freebie subscribers who have NOT purchased the vault.
  // Exclude anyone whose source = 'prompt-vault-paid' OR has 'prompt-vault-paid' in email_tags.
  const rows = await sql`
    SELECT email, name, access_token, source, email_tags
    FROM freebie_subscribers
    WHERE source = 'ai-prompts'
      AND source != 'prompt-vault-paid'
      AND NOT (email_tags @> ARRAY['prompt-vault-paid']::text[])
      AND email IS NOT NULL
      AND email != ''
    ORDER BY created_at DESC
  `
  return rows as SubscriberRow[]
}

async function fetchBuyers(): Promise<SubscriberRow[]> {
  // Vault owners: source = 'prompt-vault-paid' OR 'prompt-vault-paid' in email_tags.
  const rows = await sql`
    SELECT email, name, access_token, source, email_tags
    FROM freebie_subscribers
    WHERE (
      source = 'prompt-vault-paid'
      OR email_tags @> ARRAY['prompt-vault-paid']::text[]
    )
      AND email IS NOT NULL
      AND email != ''
    ORDER BY created_at DESC
  `
  return rows as SubscriberRow[]
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // 1. Auth
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 2. Automation gate
  if (!VAULT_EMAIL_CONFIG.automationApproved) {
    return NextResponse.json(
      {
        error: "Automation not approved.",
        hint: "Set automationApproved: true in lib/vault/drop-log.ts before triggering a drop.",
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
        hint: "A drop requires at least 2 collections with includedInEmailDrop: false.",
      },
      { status: 422 },
    )
  }

  const newCollections = getPendingCollections()
  const isDryRun = VAULT_EMAIL_CONFIG.dryRun
  const dropLabel = VAULT_EMAIL_CONFIG.dropLabel

  // 4. Fetch segments
  let nonBuyers: SubscriberRow[] = []
  let buyers: SubscriberRow[] = []

  try {
    ;[nonBuyers, buyers] = await Promise.all([fetchNonBuyers(), fetchBuyers()])
  } catch (err) {
    console.error("[vault/email-drop] DB query failed:", err)
    return NextResponse.json({ error: "Database query failed" }, { status: 500 })
  }

  // ── Dry run — return preview, no sends ──────────────────────────────────
  if (isDryRun) {
    const sampleNonbuyer = nonBuyers[0]
    const sampleBuyer = buyers[0]

    const nonBuyerPreview = sampleNonbuyer
      ? generateVaultDropNonbuyerEmail({
          firstName: sampleNonbuyer.name?.split(" ")[0] || "friend",
          newCollections,
          dropLabel,
        })
      : null

    const buyerPreview = sampleBuyer?.access_token
      ? generateVaultDropBuyerEmail({
          firstName: sampleBuyer.name?.split(" ")[0] || "friend",
          accessToken: sampleBuyer.access_token,
          newCollections,
        })
      : null

    return NextResponse.json({
      dryRun: true,
      newCollections: newCollections.map((c) => ({
        id: c.id,
        name: c.name,
        heroImage: c.heroImage,
      })),
      segments: {
        nonBuyers: {
          count: nonBuyers.length,
          sampleRecipients: nonBuyers.slice(0, 5).map((r) => ({
            email: r.email,
            name: r.name,
          })),
          subjectPreview: nonBuyerPreview?.subject ?? null,
        },
        buyers: {
          count: buyers.length,
          sampleRecipients: buyers.slice(0, 5).map((r) => ({
            email: r.email,
            name: r.name,
            hasToken: !!r.access_token,
          })),
          subjectPreview: buyerPreview?.subject ?? null,
        },
      },
      totalRecipients: nonBuyers.length + buyers.length,
      note: "Dry run complete. Set dryRun: false and automationApproved: true in lib/vault/drop-log.ts to send.",
    })
  }

  // ── Live send ────────────────────────────────────────────────────────────

  const results = {
    nonBuyers: { sent: 0, failed: 0, skipped: 0 },
    buyers:    { sent: 0, failed: 0, skipped: 0 },
  }

  const errors: { email: string; segment: string; error: string }[] = []

  // Send to non-buyers
  for (const subscriber of nonBuyers) {
    const firstName = subscriber.name?.split(" ")[0]?.trim() || "friend"
    const { subject, html, text } = generateVaultDropNonbuyerEmail({
      firstName,
      newCollections,
      dropLabel,
    })

    try {
      const result = await sendEmail({
        to: subscriber.email,
        subject,
        html,
        text,
        from: EMAIL_CONFIG.marketing.from,
        emailType: "vault-drop-nonbuyer",
        marketing: true,
        tags: ["vault-drop", "vault-nonbuyer"],
      })

      if (result.success) {
        results.nonBuyers.sent++
      } else {
        results.nonBuyers.failed++
        errors.push({ email: subscriber.email, segment: "nonbuyer", error: result.error ?? "unknown" })
      }
    } catch (err) {
      results.nonBuyers.failed++
      errors.push({ email: subscriber.email, segment: "nonbuyer", error: String(err) })
    }
  }

  // Send to buyers
  for (const subscriber of buyers) {
    if (!subscriber.access_token) {
      results.buyers.skipped++
      console.warn(`[vault/email-drop] buyer ${subscriber.email} has no access_token — skipping`)
      continue
    }

    const firstName = subscriber.name?.split(" ")[0]?.trim() || "friend"
    const { subject, html, text } = generateVaultDropBuyerEmail({
      firstName,
      accessToken: subscriber.access_token,
      newCollections,
    })

    try {
      const result = await sendEmail({
        to: subscriber.email,
        subject,
        html,
        text,
        from: EMAIL_CONFIG.marketing.from,
        emailType: "vault-drop-buyer",
        marketing: true,
        tags: ["vault-drop", "vault-buyer"],
      })

      if (result.success) {
        results.buyers.sent++
      } else {
        results.buyers.failed++
        errors.push({ email: subscriber.email, segment: "buyer", error: result.error ?? "unknown" })
      }
    } catch (err) {
      results.buyers.failed++
      errors.push({ email: subscriber.email, segment: "buyer", error: String(err) })
    }
  }

  console.log("[vault/email-drop] Drop complete:", {
    newCollections: newCollections.map((c) => c.id),
    nonBuyersSent: results.nonBuyers.sent,
    buyersSent: results.buyers.sent,
    errors: errors.length,
  })

  return NextResponse.json({
    dryRun: false,
    newCollections: newCollections.map((c) => ({ id: c.id, name: c.name })),
    results,
    errors: errors.length > 0 ? errors : undefined,
    nextStep:
      "Update lib/vault/drop-log.ts: set includedInEmailDrop: true + droppedAt for each sent collection, then set automationApproved: false.",
  })
}
