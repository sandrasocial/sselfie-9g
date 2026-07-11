import "server-only"

import { randomUUID } from "crypto"
import { sql } from "@/lib/db/client"
import {
  buildDropEmailType,
  buildDropKey,
  getPendingCollections,
  getPendingCollectionsByIds,
} from "@/lib/vault/drop-log"
import { generateVaultDropBuyerEmail } from "@/lib/email/templates/vault-drop-buyer"
import { generateVaultDropNonbuyerEmail } from "@/lib/email/templates/vault-drop-nonbuyer"
import type { VaultDropCollection } from "@/lib/vault/drop-log"

export const VAULT_DROP_MIN_COLLECTIONS = 2

type SubscriberPreview = { email: string; name: string | null }

export type VaultDropRunRow = {
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

export type VaultDropRunPreview = {
  id: string
  dropKey: string
  collectionSlugs: string[]
  status: string
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  nonBuyer: { total: number; sent: number; failed: number; skipped: number; processed: number; remaining: number }
  buyer: { total: number; sent: number; failed: number; skipped: number; processed: number; remaining: number }
}

export type VaultDropEmailPreviewPayload = {
  ready: boolean
  dropKey: string
  idempotencyKeys: {
    nonbuyer: string
    buyer: string
  }
  selectedCollectionIds: string[]
  missingCollectionIds: string[]
  availableCollections: Array<{ id: string; name: string; heroImage: string; moodLine: string }>
  collections: Array<{ id: string; name: string; heroImage: string; moodLine: string }>
  segments: {
    nonbuyers: { count: number; sampleRecipients: SubscriberPreview[] }
    buyers: { count: number; sampleRecipients: SubscriberPreview[] }
  }
  previews: {
    nonbuyer: { subject: string; html: string; text: string }
    buyer: { subject: string; html: string; text: string }
  }
  totalRecipients: number
  latestRun: VaultDropRunPreview | null
}

export function selectedVaultDropIdsFromInput(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((id) => String(id)).filter(Boolean)
  if (typeof value === "string") {
    return value
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  }
  return []
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

export function formatVaultDropRun(run: VaultDropRunRow | undefined | null): VaultDropRunPreview | null {
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

export async function getVaultDropRun(runId: string): Promise<VaultDropRunPreview | null> {
  if (!runId) return null
  const rows = (await sql`
    SELECT * FROM vault_drop_runs
    WHERE id = ${runId}
    LIMIT 1
  `) as VaultDropRunRow[]
  return formatVaultDropRun(rows[0])
}

async function expireStaleEmptyVaultDropRuns(): Promise<void> {
  await sql`
    UPDATE vault_drop_runs r
    SET status = 'cancelled',
        completed_at = COALESCE(r.completed_at, NOW()),
        notes = CONCAT_WS(
          E'\n',
          NULLIF(BTRIM(COALESCE(r.notes, '')), ''),
          'Automatically cancelled after 24 hours with no recipient work.'
        )
    WHERE r.status IN ('pending', 'processing')
      AND r.created_at < NOW() - INTERVAL '24 hours'
      AND COALESCE(r.non_buyer_sent, 0) = 0
      AND COALESCE(r.non_buyer_failed, 0) = 0
      AND COALESCE(r.non_buyer_skipped, 0) = 0
      AND COALESCE(r.buyer_sent, 0) = 0
      AND COALESCE(r.buyer_failed, 0) = 0
      AND COALESCE(r.buyer_skipped, 0) = 0
      AND NOT EXISTS (
        SELECT 1
        FROM vault_drop_recipient_claims claims
        WHERE claims.run_id = r.id
      )
  `
}

async function latestRunForDropKey(dropKey: string) {
  if (!dropKey) return null
  try {
    const rows = (await sql`
      SELECT * FROM vault_drop_runs
      WHERE drop_key = ${dropKey}
      ORDER BY created_at DESC
      LIMIT 1
    `) as VaultDropRunRow[]
    return formatVaultDropRun(rows[0])
  } catch (error) {
    console.error("[admin/vault-drop-email] latest run lookup skipped:", error)
    return null
  }
}

export async function getVaultDropEmailPreview(selectedIds: string[] = []): Promise<VaultDropEmailPreviewPayload> {
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
    ready: collections.length >= VAULT_DROP_MIN_COLLECTIONS && missingCollectionIds.length === 0,
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

export async function createVaultDropLiveRun(selectedIds: string[] = []) {
  const payload = await getVaultDropEmailPreview(selectedIds)
  if (!payload.ready) {
    return {
      success: false,
      status: 422,
      error: "A drop needs at least 2 valid pending collections.",
      pendingCount: payload.collections.length,
      missingCollectionIds: payload.missingCollectionIds,
    }
  }

  await expireStaleEmptyVaultDropRuns()

  const existingRows = (await sql`
    SELECT * FROM vault_drop_runs
    WHERE drop_key = ${payload.dropKey}
      AND status IN ('pending', 'processing')
    ORDER BY created_at DESC
    LIMIT 1
  `) as VaultDropRunRow[]

  if (existingRows[0]) {
    return {
      success: true,
      existing: true,
      run: formatVaultDropRun(existingRows[0]),
      message: "A live run already exists for these collections.",
    }
  }

  const completedRows = (await sql`
    SELECT * FROM vault_drop_runs
    WHERE drop_key = ${payload.dropKey}
      AND status IN ('completed', 'partially_completed')
    ORDER BY created_at DESC
    LIMIT 1
  `) as VaultDropRunRow[]

  if (completedRows[0]) {
    return {
      success: false,
      status: 409,
      error: "This exact collection drop already has a completed run.",
      run: formatVaultDropRun(completedRows[0]),
    }
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
  const rows = (await sql`SELECT * FROM vault_drop_runs WHERE id = ${runId}`) as VaultDropRunRow[]
  return { success: true, run: formatVaultDropRun(rows[0]) }
}
