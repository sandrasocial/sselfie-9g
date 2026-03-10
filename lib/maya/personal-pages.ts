import { sql } from "@/lib/db/client"
import type {
  MayaGeneratedAssetPreviewData,
  MayaGeneratedAssetType,
} from "@/lib/maya/generated-asset-types"

type PersonalPageType = "landing" | "calendar" | "workbook"

export interface MayaPersonalPageRow {
  id: string
  user_id: string
  owner_slug: string
  slug: string
  page_type: string
  title: string | null
  status: string
  published_html: string | null
  live_url: string | null
  version: number
  updated_at: string
}

export interface MayaAssetForPersistence {
  id: string
  assetType: MayaGeneratedAssetType
  title: string
  instruction: string
  previewText: string
  previewHtml: string
  previewData?: MayaGeneratedAssetPreviewData
  blueprint?: Record<string, unknown>
}

export interface RecordPersonalPageLeadInput {
  pageId: string
  email: string
  name?: string | null
  source?: string | null
}

let ensureTablesPromise: Promise<void> | null = null

export function sanitizePublicSlug(input: string): string {
  const normalized = (input || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/@/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")

  return normalized.slice(0, 64).replace(/-+$/g, "")
}

function normalizePathPart(value: string): string {
  return sanitizePublicSlug(decodeURIComponent(value || "").trim())
}

function mapAssetTypeToPageType(assetType: MayaGeneratedAssetType): PersonalPageType {
  if (assetType === "calendar") return "calendar"
  if (assetType === "pdf") return "workbook"
  return "landing"
}

function makeFallbackOwnerSlug(userId: string): string {
  const suffix = userId.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 8) || "member"
  return `creator-${suffix}`
}

export function buildPersonalPageSlug(input: {
  assetType: MayaGeneratedAssetType
  title: string
  assetId: string
}): string {
  const typePrefix =
    input.assetType === "calendar" ? "calendar" : input.assetType === "pdf" ? "workbook" : "landing"
  const titleSlug = sanitizePublicSlug(input.title)
  const base = titleSlug || typePrefix
  const suffix = input.assetId.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(-6) || "draft"
  const combined = `${base}-${suffix}`
  return combined.slice(0, 72).replace(/-+$/g, "")
}

async function ensurePersonalPageTables(): Promise<void> {
  if (ensureTablesPromise) {
    return ensureTablesPromise
  }

  ensureTablesPromise = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS personal_pages (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        owner_slug TEXT NOT NULL,
        slug TEXT NOT NULL,
        page_type TEXT NOT NULL DEFAULT 'landing',
        title TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        page_jsonb JSONB DEFAULT '{}'::jsonb,
        published_html TEXT,
        preview_url TEXT,
        live_url TEXT,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, slug),
        UNIQUE(owner_slug, slug)
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS maya_produced_assets (
        id TEXT PRIMARY KEY,
        asset_id TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        asset_type TEXT NOT NULL,
        title TEXT NOT NULL,
        url TEXT,
        preview_image_url TEXT,
        source_chat_id TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS personal_page_leads (
        id TEXT PRIMARY KEY,
        page_id TEXT NOT NULL REFERENCES personal_pages(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        name TEXT,
        source TEXT NOT NULL DEFAULT 'personal_page',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(page_id, email)
      )
    `

    await sql`CREATE INDEX IF NOT EXISTS idx_personal_pages_user_id ON personal_pages(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_personal_pages_owner_slug ON personal_pages(owner_slug)`
    await sql`CREATE INDEX IF NOT EXISTS idx_maya_produced_assets_user_id ON maya_produced_assets(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_personal_page_leads_page_id ON personal_page_leads(page_id)`
  })()

  try {
    await ensureTablesPromise
  } catch (error) {
    ensureTablesPromise = null
    throw error
  }
}

async function resolveOwnerSlug(userId: string): Promise<string> {
  const existingRows = await sql`
    SELECT owner_slug
    FROM personal_pages
    WHERE user_id = ${userId}
    LIMIT 1
  `

  const existingOwnerSlug = (existingRows[0] as { owner_slug?: string } | undefined)?.owner_slug
  if (typeof existingOwnerSlug === "string" && existingOwnerSlug.trim().length > 0) {
    return existingOwnerSlug
  }

  const userRows = await sql`
    SELECT display_name, email
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `
  const userRow = (userRows[0] || {}) as { display_name?: string | null; email?: string | null }
  const emailName = typeof userRow.email === "string" ? userRow.email.split("@")[0] : ""
  const base = sanitizePublicSlug(userRow.display_name || emailName || "")
  if (!base) return makeFallbackOwnerSlug(userId)

  const suffix = userId.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 6)
  return suffix ? `${base}-${suffix}`.slice(0, 64) : base
}

export async function persistMayaAssetAsPersonalPage(input: {
  userId: string | number
  asset: MayaAssetForPersistence
  sourceChatId?: string | number | null
}): Promise<{ liveUrl: string; ownerSlug: string; slug: string; version: number }> {
  const userId = String(input.userId || "").trim()
  if (!userId) {
    throw new Error("Cannot persist personal page without user id")
  }

  await ensurePersonalPageTables()

  const ownerSlug = await resolveOwnerSlug(userId)
  const nextSlug = buildPersonalPageSlug({
    assetType: input.asset.assetType,
    title: input.asset.title,
    assetId: input.asset.id,
  })
  const pageType = mapAssetTypeToPageType(input.asset.assetType)
  const initialLiveUrl = `/p/${ownerSlug}/${nextSlug}`
  const metadata = {
    assetId: input.asset.id,
    assetType: input.asset.assetType,
    instruction: input.asset.instruction,
    previewText: input.asset.previewText,
    previewData: input.asset.previewData || null,
    blueprint: input.asset.blueprint || null,
  }

  const upsertRows = await sql`
    INSERT INTO personal_pages (
      id,
      user_id,
      owner_slug,
      slug,
      page_type,
      title,
      status,
      page_jsonb,
      published_html,
      preview_url,
      live_url,
      version,
      updated_at
    )
    VALUES (
      ${input.asset.id},
      ${userId},
      ${ownerSlug},
      ${nextSlug},
      ${pageType},
      ${input.asset.title},
      'published',
      ${JSON.stringify(metadata)}::jsonb,
      ${input.asset.previewHtml},
      NULL,
      ${initialLiveUrl},
      1,
      NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET
      title = EXCLUDED.title,
      page_type = EXCLUDED.page_type,
      status = 'published',
      page_jsonb = EXCLUDED.page_jsonb,
      published_html = EXCLUDED.published_html,
      live_url = '/p/' || personal_pages.owner_slug || '/' || personal_pages.slug,
      version = personal_pages.version + 1,
      updated_at = NOW()
    RETURNING owner_slug, slug, live_url, version
  `

  const row = (upsertRows[0] || {}) as { owner_slug?: string; slug?: string; live_url?: string; version?: number }
  const resolvedOwnerSlug = row.owner_slug || ownerSlug
  const resolvedSlug = row.slug || nextSlug
  const liveUrl = row.live_url || `/p/${resolvedOwnerSlug}/${resolvedSlug}`

  const sourceChatId =
    typeof input.sourceChatId === "string"
      ? input.sourceChatId
      : typeof input.sourceChatId === "number"
        ? String(input.sourceChatId)
        : null

  await sql`
    INSERT INTO maya_produced_assets (
      id,
      asset_id,
      user_id,
      asset_type,
      title,
      url,
      preview_image_url,
      source_chat_id,
      metadata,
      updated_at
    )
    VALUES (
      ${`maya_asset_${input.asset.id}`},
      ${input.asset.id},
      ${userId},
      ${input.asset.assetType},
      ${input.asset.title},
      ${liveUrl},
      NULL,
      ${sourceChatId},
      ${JSON.stringify(metadata)}::jsonb,
      NOW()
    )
    ON CONFLICT (asset_id) DO UPDATE
    SET
      title = EXCLUDED.title,
      asset_type = EXCLUDED.asset_type,
      url = EXCLUDED.url,
      source_chat_id = EXCLUDED.source_chat_id,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
  `

  return {
    liveUrl,
    ownerSlug: resolvedOwnerSlug,
    slug: resolvedSlug,
    version: Number(row.version || 1),
  }
}

export async function getPublishedPersonalPageByPath(input: {
  username: string
  slug: string
}): Promise<MayaPersonalPageRow | null> {
  const username = normalizePathPart(input.username)
  const slug = normalizePathPart(input.slug)
  if (!username || !slug) return null

  await ensurePersonalPageTables()

  const rows = await sql`
    SELECT id, user_id, owner_slug, slug, page_type, title, status, published_html, live_url, version, updated_at
    FROM personal_pages
    WHERE owner_slug = ${username}
      AND slug = ${slug}
      AND status = 'published'
    LIMIT 1
  `

  return (rows[0] as MayaPersonalPageRow | undefined) || null
}

export async function listPersonalPagesForUser(
  userId: string | number,
  limit = 20,
): Promise<MayaPersonalPageRow[]> {
  const normalizedUserId = String(userId || "").trim()
  if (!normalizedUserId) return []

  await ensurePersonalPageTables()

  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(100, Math.floor(limit))) : 20
  const rows = await sql`
    SELECT id, user_id, owner_slug, slug, page_type, title, status, published_html, live_url, version, updated_at
    FROM personal_pages
    WHERE user_id = ${normalizedUserId}
    ORDER BY updated_at DESC
    LIMIT ${safeLimit}
  `

  return rows as MayaPersonalPageRow[]
}

export async function recordPersonalPageLead(input: RecordPersonalPageLeadInput): Promise<{ saved: boolean }> {
  const pageId = String(input.pageId || "").trim()
  const email = String(input.email || "").trim().toLowerCase()
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 120) : null
  const source = typeof input.source === "string" && input.source.trim().length > 0 ? input.source.trim().slice(0, 64) : "personal_page"

  if (!pageId || !email) {
    return { saved: false }
  }

  await ensurePersonalPageTables()

  await sql`
    INSERT INTO personal_page_leads (
      id,
      page_id,
      email,
      name,
      source,
      created_at
    )
    VALUES (
      ${`lead_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`},
      ${pageId},
      ${email},
      ${name},
      ${source},
      NOW()
    )
    ON CONFLICT (page_id, email) DO UPDATE
    SET
      name = COALESCE(EXCLUDED.name, personal_page_leads.name),
      source = EXCLUDED.source
  `

  return { saved: true }
}
