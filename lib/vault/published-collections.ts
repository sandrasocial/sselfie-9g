import "server-only"

import { sql } from "@/lib/db/client"
import type {
  PromptCard,
  VaultCollectionMeta,
  VaultFreebieCollectionPreview,
} from "@/lib/ai-prompts/prompt-data"
import { selectRotatingPublishedFreebieCollections } from "@/lib/vault/freebie-curation"
import { derivePublicVaultWhenToUse } from "@/lib/vault/public-copy"

export type PublishedVaultCollection = {
  id: number
  slug: string
  title: string
  note: string
  heroImage: string | null
  moodLine: string
  sourceShootId: number | null
  giveawayShotId: string | null
  emailDropStatus: "queued" | "included" | "skipped"
  emailDropIncludedAt: string | null
  publishedAt: string
  cards: PromptCard[]
}

let schemaReady: Promise<void> | null = null

export function toVaultSlug(title: string, sourceId?: number | null): string {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 52)
  return [base || "vault-collection", sourceId ? String(sourceId) : ""].filter(Boolean).join("-")
}

export function toAestheticId(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*editorial\s*$/i, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function toDisplayName(name: string): string {
  return name.replace(/\s*Editorial\s*$/i, "").trim()
}

export function extractMoodLine(cards: PromptCard[]): string {
  const firstMood = cards[0]?.mood
    ?.split("·")
    .map(part => part.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(". ")
  if (firstMood) return `${firstMood}.`
  return "A new SSELFIE editorial photoshoot."
}

export async function ensureVaultCollectionsSchema(): Promise<void> {
  schemaReady ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS vault_collections (
        id SERIAL PRIMARY KEY,
        source_shoot_id INTEGER UNIQUE,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'published',
        giveaway_shot_id TEXT,
        hero_image_url TEXT,
        mood_line TEXT NOT NULL DEFAULT '',
        inspiration_urls JSONB NOT NULL DEFAULT '[]',
        email_drop_status TEXT NOT NULL DEFAULT 'queued',
        email_drop_included_at TIMESTAMPTZ,
        published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS vault_prompts (
        id SERIAL PRIMARY KEY,
        collection_id INTEGER NOT NULL REFERENCES vault_collections(id) ON DELETE CASCADE,
        source_shot_id TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        number TEXT NOT NULL,
        card_id TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        when_to_use TEXT NOT NULL,
        mood TEXT NOT NULL,
        prompt TEXT NOT NULL,
        example_image TEXT,
        status TEXT NOT NULL DEFAULT 'published',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(collection_id, source_shot_id)
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_vault_collections_published ON vault_collections (status, published_at DESC)`
    await sql`CREATE INDEX IF NOT EXISTS idx_vault_prompts_collection ON vault_prompts (collection_id, sort_order)`
  })()
  await schemaReady
}

function parseCards(value: unknown): PromptCard[] {
  const raw = typeof value === "string" ? JSON.parse(value) : value
  if (!Array.isArray(raw)) return []
  return raw
    .map((card: any): PromptCard | null => {
      if (!card?.id || !card?.title || !card?.prompt) return null
      return {
        number: String(card.number || ""),
        id: String(card.id),
        title: String(card.title),
        whenToUse: derivePublicVaultWhenToUse({
          title: String(card.title),
          mood: String(card.mood || ""),
          whenToUse: String(card.whenToUse || ""),
        }),
        mood: String(card.mood || ""),
        prompt: String(card.prompt),
        exampleImage: typeof card.exampleImage === "string" ? card.exampleImage : undefined,
      }
    })
    .filter((card): card is PromptCard => card !== null)
}

export async function getPublishedVaultCollections(): Promise<PublishedVaultCollection[]> {
  try {
    await ensureVaultCollectionsSchema()
    const rows = (await sql`
      SELECT
        c.id,
        c.slug,
        c.title,
        c.source_shoot_id,
        c.giveaway_shot_id,
        c.hero_image_url,
        c.mood_line,
        c.email_drop_status,
        c.email_drop_included_at,
        c.published_at,
        COALESCE(
          json_agg(
            json_build_object(
              'number', p.number,
              'id', p.card_id,
              'title', p.title,
              'whenToUse', p.when_to_use,
              'mood', p.mood,
              'prompt', p.prompt,
              'exampleImage', p.example_image
            )
            ORDER BY p.sort_order ASC
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'::json
        ) AS cards
      FROM vault_collections c
      LEFT JOIN vault_prompts p ON p.collection_id = c.id AND p.status = 'published'
      WHERE c.status = 'published'
      GROUP BY c.id
      ORDER BY c.published_at DESC, c.id DESC
    `) as any[]

    return rows
      .map(row => {
        const cards = parseCards(row.cards)
        return {
          id: Number(row.id),
          slug: String(row.slug),
          title: String(row.title),
          note: cards[0]?.whenToUse || "A new SSELFIE editorial photoshoot.",
          heroImage: (row.hero_image_url as string | null) || cards[0]?.exampleImage || null,
          moodLine: String(row.mood_line || extractMoodLine(cards)),
          sourceShootId: row.source_shoot_id === null ? null : Number(row.source_shoot_id),
          giveawayShotId: (row.giveaway_shot_id as string | null) ?? null,
          emailDropStatus: (row.email_drop_status ||
            "queued") as PublishedVaultCollection["emailDropStatus"],
          emailDropIncludedAt: row.email_drop_included_at
            ? new Date(row.email_drop_included_at).toISOString()
            : null,
          publishedAt: new Date(row.published_at).toISOString(),
          cards,
        }
      })
      .filter(collection => collection.cards.length > 0)
  } catch (error) {
    console.error("[vault] published collection load failed:", error)
    return []
  }
}

export async function getPublishedVaultCollectionBySourceShootId(
  sourceShootId: number
): Promise<PublishedVaultCollection | null> {
  const collections = await getPublishedVaultCollections()
  return collections.find((collection) => collection.sourceShootId === sourceShootId) ?? null
}

export async function getPublishedVaultCollectionMeta(): Promise<VaultCollectionMeta[]> {
  const collections = await getPublishedVaultCollections()
  return collections.map(collection => ({
    previewCardId: collection.cards[0].id,
    name: collection.title,
    shotCount: collection.cards.length,
    thumbnails: collection.cards
      .map(card => card.exampleImage)
      .filter((url): url is string => !!url),
  }))
}

export async function getPublishedFreebiePreviews(): Promise<PromptCard[]> {
  const collections = await getPublishedVaultCollections()
  return collections.map(collection => collection.cards[0]).filter(Boolean)
}

export async function getPublishedFreebieCollectionPreviews(
  options: { limit?: number } = {}
): Promise<VaultFreebieCollectionPreview[]> {
  const collections = await getPublishedVaultCollections()
  return selectRotatingPublishedFreebieCollections(collections, options)
}

export async function getPublishedVaultDropCollections(options: { queuedOnly?: boolean } = {}) {
  const queuedOnly = options.queuedOnly ?? true
  const collections = await getPublishedVaultCollections()
  return collections
    .filter(collection => !queuedOnly || collection.emailDropStatus === "queued")
    .map(collection => ({
      id: collection.slug,
      name: collection.title,
      heroImage: collection.heroImage || collection.cards[0]?.exampleImage || "",
      moodLine: collection.moodLine,
      includedInEmailDrop: collection.emailDropStatus === "included",
      droppedAt: collection.emailDropIncludedAt?.slice(0, 10) ?? null,
    }))
}
