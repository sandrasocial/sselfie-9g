import { randomUUID } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-feature-flags"
import { sql } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/send-email"
import { EMAIL_CONFIG } from "@/lib/email/config"
import {
  buildDropEmailType,
  buildDropKey,
  getPendingCollections,
  getPendingCollectionsByIds,
} from "@/lib/vault/drop-log"
import { generateVaultDropBuyerEmail } from "@/lib/email/templates/vault-drop-buyer"
import { generateVaultDropNonbuyerEmail } from "@/lib/email/templates/vault-drop-nonbuyer"
import type { VaultDropCollection } from "@/lib/vault/drop-log"

export const dynamic = "force-dynamic"

const ADMIN_TEST_EMAIL = "ssa@ssasocial.com"

type SubscriberPreview = { email: string; name: string | null }

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
  created_at: string
  started_at: string | null
  completed_at: string | null
  notes: string | null
}

async function requireAdminResponse() {
  const admin = await requireAdmin()
  if (!admin.isAdmin) {
    return NextResponse.json({ error: admin.error || "Unauthorized" }, { status: 401 })
  }
  return null
}

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
  return { count: all.length, sample: all.slice(0, 5) }
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
  return { count: all.length, sample: all.slice(0, 5) }
}

function buildEmails(collections: VaultDropCollection[]) {
  return {
    nonbuyer: generateVaultDropNonbuyerEmail({
      firstName: "Sandra",
      newCollections: collections,
      accessToken: "PREVIEW_TOKEN",
    }),
    buyer: generateVaultDropBuyerEmail({
      firstName: "Sandra",
      accessToken: "PREVIEW_TOKEN",
      newCollections: collections,
    }),
  }
}

function selectedIdsFromInput(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((id) => String(id)).filter(Boolean)
  if (typeof value === "string") {
    return value.split(",").map((id) => id.trim()).filter(Boolean)
  }
  return []
}

function formatRun(run: DropRunRow | undefined | null) {
  if (!run) return null
  const nonBuyerProcessed = run.non_buyer_sent + run.non_buyer_failed + run.non_buyer_skipped
  const buyerProcessed = run.buyer_sent + run.buyer_failed + run.buyer_skipped
  return {
    id: run.id,
    dropKey: run.drop_key,
    collectionSlugs: run.collection_slugs,
    status: run.status,
    createdAt: run.created_at,
    startedAt: run.started_at,
    completedAt: run.completed_at,
    nonBuyer: {
      total: run.non_buyer_total,
      sent: run.non_buyer_sent,
      failed: run.non_buyer_failed,
      skipped: run.non_buyer_skipped,
      processed: nonBuyerProcessed,
      remaining: Math.max(0, run.non_buyer_total - nonBuyerProcessed),
    },
    buyer: {
      total: run.buyer_total,
      sent: run.buyer_sent,
      failed: run.buyer_failed,
      skipped: run.buyer_skipped,
      processed: buyerProcessed,
      remaining: Math.max(0, run.buyer_total - buyerProcessed),
    },
  }
}

async function latestRunForDropKey(dropKey: string) {
  if (!dropKey) return null
  try {
    const rows = (await sql`
      SELECT * FROM vault_drop_runs
      WHERE drop_key = ${dropKey}
      ORDER BY created_at DESC
      LIMIT 1
    `) as DropRunRow[]
    return formatRun(rows[0])
  } catch (error) {
    console.error("[admin/vault-drop-email] latest run lookup skipped:", error)
    return null
  }
}

async function buildPreviewPayload(selectedIds: string[] = []) {
  const availableCollections = await getPendingCollections()
  const shootStudioIds = availableCollections
    .filter((collection) => collection.heroImage.includes("/content-kit/shoots/"))
    .map((collection) => collection.id)
  const fallbackIds = (shootStudioIds.length > 0 ? shootStudioIds : availableCollections.map((collection) => collection.id)).slice(0, 2)
  const requestedIds = selectedIds.length > 0 ? selectedIds : fallbackIds
  const collections = requestedIds.length > 0 ? await getPendingCollectionsByIds(requestedIds) : []
  const resolvedIds = new Set(collections.map((collection) => collection.id))
  const missingCollectionIds = requestedIds.filter((id) => !resolvedIds.has(id))
  const dropKey = buildDropKey(collections)
  const nonbuyerEmailType = buildDropEmailType(dropKey, "nonbuyer")
  const buyerEmailType = buildDropEmailType(dropKey, "buyer")
  const [nonbuyer, buyer] = await Promise.all([
    countAndPreviewNonBuyers(nonbuyerEmailType),
    countAndPreviewBuyers(buyerEmailType),
  ])
  const emails = buildEmails(collections)

  return {
    ready: collections.length >= 2 && missingCollectionIds.length === 0,
    dropKey,
    idempotencyKeys: {
      nonbuyer: nonbuyerEmailType,
      buyer: buyerEmailType,
    },
    selectedCollectionIds: collections.map((collection) => collection.id),
    missingCollectionIds,
    availableCollections: availableCollections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      heroImage: collection.heroImage,
      moodLine: collection.moodLine,
    })),
    collections: collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      heroImage: collection.heroImage,
      moodLine: collection.moodLine,
    })),
    segments: {
      nonbuyers: {
        count: nonbuyer.count,
        sampleRecipients: nonbuyer.sample,
      },
      buyers: {
        count: buyer.count,
        sampleRecipients: buyer.sample,
      },
    },
    previews: {
      nonbuyer: emails.nonbuyer,
      buyer: emails.buyer,
    },
    totalRecipients: nonbuyer.count + buyer.count,
    latestRun: await latestRunForDropKey(dropKey),
  }
}

export async function GET(request: NextRequest) {
  const authError = await requireAdminResponse()
  if (authError) return authError

  try {
    const selectedIds = selectedIdsFromInput(request.nextUrl.searchParams.get("collectionIds"))
    return NextResponse.json(await buildPreviewPayload(selectedIds))
  } catch (error) {
    console.error("[admin/vault-drop-email] preview failed:", error)
    return NextResponse.json({ error: "Could not build email preview" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminResponse()
  if (authError) return authError

  try {
    const body = await request.json().catch(() => ({}))
    const action = body.action || "send_test"
    const audience = body.audience === "buyer" ? "buyer" : "nonbuyer"
    const selectedIds = selectedIdsFromInput(body.collectionIds)
    const payload = await buildPreviewPayload(selectedIds)
    if (!payload.ready) {
      return NextResponse.json(
        {
          error: "A drop needs at least 2 valid pending collections.",
          pendingCount: payload.collections.length,
          missingCollectionIds: payload.missingCollectionIds,
        },
        { status: 422 },
      )
    }

    if (action === "start_live_run") {
      const existingRows = (await sql`
        SELECT * FROM vault_drop_runs
        WHERE drop_key = ${payload.dropKey}
          AND status IN ('pending', 'processing')
        ORDER BY created_at DESC
        LIMIT 1
      `) as DropRunRow[]

      if (existingRows[0]) {
        return NextResponse.json({
          success: true,
          existing: true,
          run: formatRun(existingRows[0]),
          message: "A live run already exists for these collections.",
        })
      }

      const completedRows = (await sql`
        SELECT * FROM vault_drop_runs
        WHERE drop_key = ${payload.dropKey}
          AND status IN ('completed', 'partially_completed')
        ORDER BY created_at DESC
        LIMIT 1
      `) as DropRunRow[]

      if (completedRows[0]) {
        return NextResponse.json(
          {
            success: false,
            error: "This exact collection drop already has a completed run.",
            run: formatRun(completedRows[0]),
          },
          { status: 409 },
        )
      }

      const runId = randomUUID()
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
          ${payload.dropKey},
          ${payload.collections.map((collection) => collection.id)},
          false,
          'pending',
          ${payload.segments.nonbuyers.count},
          ${payload.segments.buyers.count},
          NOW()
        )
      `
      const rows = (await sql`SELECT * FROM vault_drop_runs WHERE id = ${runId}`) as DropRunRow[]
      return NextResponse.json({ success: true, run: formatRun(rows[0]) })
    }

    if (action === "process_batch") {
      const runId = typeof body.runId === "string" ? body.runId : payload.latestRun?.id
      if (!runId) {
        return NextResponse.json({ success: false, error: "Create a live run before processing batches." }, { status: 422 })
      }

      const secret = process.env.VAULT_EMAIL_DROP_SECRET
      if (!secret) {
        return NextResponse.json(
          { success: false, error: "VAULT_EMAIL_DROP_SECRET is missing, so the batch processor cannot run." },
          { status: 500 },
        )
      }

      const response = await fetch(new URL("/api/vault/email-drop/process", request.url), {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          runId,
          audienceType: body.audienceType || "all",
          batchSize: Number(body.batchSize || 25),
        }),
      })
      const data = await response.json()
      return NextResponse.json({ success: response.ok, ...data }, { status: response.status })
    }

    const email = audience === "buyer" ? payload.previews.buyer : payload.previews.nonbuyer
    const result = await sendEmail({
      to: ADMIN_TEST_EMAIL,
      subject: `[TEST] ${email.subject}`,
      html: email.html,
      text: email.text,
      from: EMAIL_CONFIG.marketing.from,
      replyTo: EMAIL_CONFIG.marketing.replyTo,
      marketing: true,
      emailType: `vault_drop_preview_test_${audience}`,
      tags: ["admin-test", "vault-drop-preview", `vault-${audience}`],
      idempotencyKey: `vault-drop-preview/${payload.dropKey}/${audience}/${new Date().toISOString().slice(0, 13)}`,
    })

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || "Test send failed" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      audience,
      to: ADMIN_TEST_EMAIL,
      messageId: result.messageId,
      subject: `[TEST] ${email.subject}`,
    })
  } catch (error) {
    console.error("[admin/vault-drop-email] test send failed:", error)
    return NextResponse.json({ success: false, error: "Could not send test email" }, { status: 500 })
  }
}
