import "server-only"

import { sql } from "@/lib/db/client"
import {
  extractPromptNumber,
  FREEBIE_COLLECTION_PREVIEWS,
  getStaticPromptByNumber,
  getStaticVaultPromptCards,
  normalizePromptNumber,
  STATIC_VAULT_COLLECTION_SERIES,
  type PromptCard,
  type VaultLockedShotPreview,
} from "@/lib/ai-prompts/prompt-data"
import {
  ensurePublishedVaultPromptNumbers,
  ensureVaultCollectionsSchema,
} from "@/lib/vault/published-collections"

export type NumberedPrompt = {
  card: PromptCard
  number: string
  sourceCollection: string
  source: "static" | "published"
  lockedShots: VaultLockedShotPreview[]
  shotCount: number
}

type PublishedPromptRow = {
  number: string
  card_id: string
  title: string
  when_to_use: string
  mood: string
  prompt: string
  example_image: string | null
  collection_title: string
  locked_shots: VaultLockedShotPreview[] | null
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://www.sselfie.ai")
    .replace(/^https:\/\/sselfie\.ai$/, "https://www.sselfie.ai")
    .replace(/\/+$/, "")
}

export function buildPromptPageUrl(
  number: string | number,
  attribution?: Record<string, string | number | null | undefined>,
): string {
  const normalized = normalizePromptNumber(number) || String(number).trim()
  const url = new URL(`${siteUrl()}/p/${encodeURIComponent(normalized)}`)
  for (const [key, value] of Object.entries(attribution || {})) {
    const clean = String(value ?? "").trim()
    if (clean) url.searchParams.set(key, clean.slice(0, 500))
  }
  return url.toString()
}

export function buildLatestPromptPageUrl(): string {
  return `${siteUrl()}/p/latest`
}

export function buildPromptPageVaultCheckoutHref(input: {
  promptNumber: string | number
  promptId?: string | null
  promptTitle?: string | null
  freebieToken?: string | null
  attribution?: {
    source?: string | null
    utm_source?: string | null
    utm_medium?: string | null
    utm_campaign?: string | null
    utm_content?: string | null
    checkout_source?: string | null
    cta_keyword?: string | null
    entry_post_slug?: string | null
    buyer_stage?: string | null
    landing_path?: string | null
    quiz_result?: string | null
  }
}) {
  const number = normalizePromptNumber(input.promptNumber) || String(input.promptNumber).trim()
  const params = new URLSearchParams({
    source: "prompt_page",
    utm_source: "instagram",
    utm_medium: "manychat",
    utm_campaign: "numbered_prompt_to_vault",
    utm_content: `prompt_${number}`,
    checkout_source: "prompt_page_vault_upsell",
    buyer_stage: "lead",
    cta_keyword: number,
    prompt_n: number,
    entry_path: `/p/${number}`,
  })

  for (const [key, value] of Object.entries(input.attribution || {})) {
    const clean = String(value ?? "").trim()
    if (clean) params.set(key, clean.slice(0, 500))
  }
  params.set("prompt_n", number)
  params.set("entry_path", `/p/${number}`)
  if (input.promptId?.trim()) params.set("prompt_id", input.promptId.trim())
  if (input.promptTitle?.trim()) params.set("prompt_title", input.promptTitle.trim().slice(0, 120))
  if (input.freebieToken?.trim()) params.set("freebie_token", input.freebieToken.trim())

  return `/checkout/prompt-vault?${params.toString()}`
}

export async function getLiveVaultPromptCount(): Promise<number> {
  let publishedCount = 0

  try {
    await ensureVaultCollectionsSchema()
    await ensurePublishedVaultPromptNumbers()
    const rows = (await sql`
      SELECT COUNT(*)::int AS count
      FROM vault_prompts p
      INNER JOIN vault_collections c ON c.id = p.collection_id
      WHERE p.status = 'published'
        AND c.status = 'published'
    `) as Array<{ count: number }>
    publishedCount = Number(rows[0]?.count || 0)
  } catch (error) {
    console.error("[prompt-lookup] failed to count published prompts:", error)
  }

  return getStaticVaultPromptCards().length + publishedCount
}

function mapPublishedPromptRow(row: PublishedPromptRow): NumberedPrompt {
  const lockedShots = Array.isArray(row.locked_shots) ? row.locked_shots : []
  return {
    number: row.number,
    source: "published",
    sourceCollection: row.collection_title,
    lockedShots,
    shotCount: lockedShots.length + 1,
    card: {
      number: row.number,
      id: row.card_id,
      title: row.title,
      whenToUse: row.when_to_use,
      mood: row.mood,
      prompt: row.prompt,
      exampleImage: row.example_image || undefined,
    },
  }
}

function mapStaticPrompt(
  staticPrompt: { card: PromptCard; collectionName: string },
  number: string,
): NumberedPrompt {
  const series = STATIC_VAULT_COLLECTION_SERIES.find(collection =>
    collection.some(card => card.id === staticPrompt.card.id)
  ) ?? [staticPrompt.card]
  const lockedShots = series
    .filter(card => card.id !== staticPrompt.card.id)
    .map(card => ({ title: card.title, exampleImage: card.exampleImage }))

  return {
    card: staticPrompt.card,
    number,
    sourceCollection: staticPrompt.collectionName,
    source: "static",
    lockedShots,
    shotCount: lockedShots.length + 1,
  }
}

async function getNewestPublishedFreePrompt(): Promise<NumberedPrompt | null> {
  try {
    await ensureVaultCollectionsSchema()
    await ensurePublishedVaultPromptNumbers()
    const rows = (await sql`
      SELECT
        p.number,
        p.card_id,
        p.title,
        p.when_to_use,
        p.mood,
        p.prompt,
        p.example_image,
        c.title AS collection_title,
        COALESCE((
          SELECT JSONB_AGG(
            JSONB_BUILD_OBJECT('title', sibling.title, 'exampleImage', sibling.example_image)
            ORDER BY sibling.sort_order ASC, sibling.id ASC
          )
          FROM vault_prompts sibling
          WHERE sibling.collection_id = p.collection_id
            AND sibling.status = 'published'
            AND sibling.id <> p.id
        ), '[]'::jsonb) AS locked_shots
      FROM vault_prompts p
      INNER JOIN vault_collections c ON c.id = p.collection_id
      WHERE p.status = 'published'
        AND c.status = 'published'
      ORDER BY
        c.published_at DESC,
        c.id DESC,
        CASE
          WHEN c.giveaway_shot_id IS NOT NULL AND p.source_shot_id = c.giveaway_shot_id THEN 0
          ELSE 1
        END,
        p.sort_order ASC,
        p.id ASC
      LIMIT 1
    `) as PublishedPromptRow[]

    const row = rows[0]
    return row ? mapPublishedPromptRow(row) : null
  } catch (error) {
    console.error("[prompt-lookup] failed to resolve newest published free prompt:", error)
    return null
  }
}

export async function getCurrentFreePrompt(): Promise<NumberedPrompt | null> {
  const configuredNumber = normalizePromptNumber(
    process.env.CURRENT_FREE_PROMPT_NUMBER ||
      process.env.NEXT_PUBLIC_CURRENT_FREE_PROMPT_NUMBER ||
      "",
  )

  if (configuredNumber) {
    const configuredPrompt = await getPromptByNumber(configuredNumber)
    if (configuredPrompt) return configuredPrompt
  }

  const publishedPrompt = await getNewestPublishedFreePrompt()
  if (publishedPrompt) return publishedPrompt

  const staticNumber = FREEBIE_COLLECTION_PREVIEWS[0]?.number
  const staticPrompt = staticNumber ? getStaticPromptByNumber(staticNumber) : null
  if (!staticPrompt) return null

  return mapStaticPrompt(
    staticPrompt,
    normalizePromptNumber(staticPrompt.card.number) || staticPrompt.card.number,
  )
}

export async function getPromptByNumber(value: string | number): Promise<NumberedPrompt | null> {
  const number = extractPromptNumber(value)
  if (!number) return null

  const staticPrompt = getStaticPromptByNumber(number)
  if (staticPrompt) {
    return mapStaticPrompt(staticPrompt, number)
  }

  try {
    await ensureVaultCollectionsSchema()
    await ensurePublishedVaultPromptNumbers()
    const rows = (await sql`
      SELECT
        p.number,
        p.card_id,
        p.title,
        p.when_to_use,
        p.mood,
        p.prompt,
        p.example_image,
        c.title AS collection_title,
        COALESCE((
          SELECT JSONB_AGG(
            JSONB_BUILD_OBJECT('title', sibling.title, 'exampleImage', sibling.example_image)
            ORDER BY sibling.sort_order ASC, sibling.id ASC
          )
          FROM vault_prompts sibling
          WHERE sibling.collection_id = p.collection_id
            AND sibling.status = 'published'
            AND sibling.id <> p.id
        ), '[]'::jsonb) AS locked_shots
      FROM vault_prompts p
      INNER JOIN vault_collections c ON c.id = p.collection_id
      WHERE p.status = 'published'
        AND c.status = 'published'
        AND p.number = ${number}
      LIMIT 1
    `) as PublishedPromptRow[]

    const row = rows[0]
    if (!row) return null

    return mapPublishedPromptRow(row)
  } catch (error) {
    console.error("[prompt-lookup] failed to resolve prompt:", error)
    return null
  }
}
