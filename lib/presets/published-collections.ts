import "server-only"

import { sql } from "@/lib/db/client"

export type PresetCollection = {
  id: number
  name: string
  slug: string
  description: string
  coverImageUrl: string | null
  beforeImageUrl: string | null
  afterImageUrl: string | null
  mobileDngUrl: string | null
  desktopXmpUrl: string | null
  setupGuideUrl: string | null
  sortOrder: number
  publishedAt: string
}

let schemaReady: Promise<void> | null = null

export function toPresetSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "preset-collection"
}

export async function ensurePresetCollectionsSchema(): Promise<void> {
  schemaReady ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS preset_collections (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'published',
        cover_image_url TEXT,
        before_image_url TEXT,
        after_image_url TEXT,
        mobile_dng_url TEXT,
        desktop_xmp_url TEXT,
        setup_guide_url TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_preset_collections_published
      ON preset_collections (status, sort_order ASC, published_at DESC)
    `
  })()

  await schemaReady
}

function mapPresetCollection(row: any): PresetCollection {
  return {
    id: Number(row.id),
    name: String(row.name),
    slug: String(row.slug),
    description: String(row.description || ""),
    coverImageUrl: (row.cover_image_url as string | null) || null,
    beforeImageUrl: (row.before_image_url as string | null) || null,
    afterImageUrl: (row.after_image_url as string | null) || null,
    mobileDngUrl: (row.mobile_dng_url as string | null) || null,
    desktopXmpUrl: (row.desktop_xmp_url as string | null) || null,
    setupGuideUrl: (row.setup_guide_url as string | null) || null,
    sortOrder: Number(row.sort_order || 0),
    publishedAt: new Date(row.published_at).toISOString(),
  }
}

export async function getPublishedPresetCollections(): Promise<PresetCollection[]> {
  try {
    await ensurePresetCollectionsSchema()
    const rows = await sql`
      SELECT
        id,
        name,
        slug,
        description,
        cover_image_url,
        before_image_url,
        after_image_url,
        mobile_dng_url,
        desktop_xmp_url,
        setup_guide_url,
        sort_order,
        published_at
      FROM preset_collections
      WHERE status = 'published'
      ORDER BY sort_order ASC, published_at DESC, id DESC
    `

    return rows.map(mapPresetCollection)
  } catch (error) {
    console.error("[presets] published collection load failed:", error)
    return []
  }
}

export async function getPresetCollectionBySlug(slug: string): Promise<PresetCollection | null> {
  const cleanSlug = slug.trim()
  if (!cleanSlug) return null

  const collections = await getPublishedPresetCollections()
  return collections.find(collection => collection.slug === cleanSlug) ?? null
}

export async function getDefaultPresetCollection(): Promise<PresetCollection | null> {
  const collections = await getPublishedPresetCollections()
  return collections[0] ?? null
}

export async function getPresetCollectionsForAccess(input: {
  tier: "single" | "bundle"
  collectionSlug?: string | null
}): Promise<PresetCollection[]> {
  const collections = await getPublishedPresetCollections()

  if (input.tier === "bundle") {
    return collections
  }

  const selected = input.collectionSlug
    ? collections.find(collection => collection.slug === input.collectionSlug)
    : null

  return selected ? [selected] : []
}
