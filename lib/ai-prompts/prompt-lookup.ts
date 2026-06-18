import "server-only"

import { sql } from "@/lib/db/client"
import {
  getStaticPromptByNumber,
  getStaticVaultPromptCards,
  normalizePromptNumber,
  type PromptCard,
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
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://www.sselfie.ai")
    .replace(/^https:\/\/sselfie\.ai$/, "https://www.sselfie.ai")
    .replace(/\/+$/, "")
}

export function buildPromptPageUrl(number: string | number): string {
  const normalized = normalizePromptNumber(number) || String(number).trim()
  return `${siteUrl()}/p/${encodeURIComponent(normalized)}`
}

export function buildPromptPageVaultCheckoutHref(input: {
  promptNumber: string | number
  promptId?: string | null
  promptTitle?: string | null
  freebieToken?: string | null
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

export async function getPromptByNumber(value: string | number): Promise<NumberedPrompt | null> {
  const number = normalizePromptNumber(value)
  if (!number) return null

  const staticPrompt = getStaticPromptByNumber(number)
  if (staticPrompt) {
    return {
      card: staticPrompt.card,
      number,
      sourceCollection: staticPrompt.collectionName,
      source: "static",
    }
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
        c.title AS collection_title
      FROM vault_prompts p
      INNER JOIN vault_collections c ON c.id = p.collection_id
      WHERE p.status = 'published'
        AND c.status = 'published'
        AND p.number = ${number}
      LIMIT 1
    `) as Array<{
      number: string
      card_id: string
      title: string
      when_to_use: string
      mood: string
      prompt: string
      example_image: string | null
      collection_title: string
    }>

    const row = rows[0]
    if (!row) return null

    return {
      number,
      source: "published",
      sourceCollection: row.collection_title,
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
  } catch (error) {
    console.error("[prompt-lookup] failed to resolve prompt:", error)
    return null
  }
}
