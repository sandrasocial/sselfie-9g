// Vault Maya look library: every vault collection (live DB drops + static series) as
// tappable looks, and the CreativeBrief builder that feeds a look into the existing
// app-v3 generation pipeline. The vault prompt travels VERBATIM as brief.sceneTemplate
// (identity paragraph stripped — the compiler adds its own identity anchor), so the
// frozen Track A compiler reproduces the vault look without any prompt-framework change.

import {
  getPublishedVaultCollections,
  toAestheticId,
} from "@/lib/vault/published-collections"
import {
  STATIC_VAULT_COLLECTION_SERIES,
  VAULT_COLLECTION_META,
  type PromptCard,
} from "@/lib/ai-prompts/prompt-data"
import { stripIdentityParagraph } from "@/lib/app-v3/maya/vault-styles"
import type { CreativeBrief } from "@/lib/app-v3/maya/concept-types"

export type VaultMayaLook = {
  cardKey: string
  number: string
  title: string
  mood: string
  exampleImage: string | null
}

export type VaultMayaCollection = {
  slug: string
  title: string
  moodLine: string
  heroImage: string | null
  aestheticId: string
  isWeeklyDrop: boolean
  looks: VaultMayaLook[]
}

type ResolvedCard = {
  card: PromptCard
  collectionTitle: string
  aestheticId: string
}

function staticCollections(): { title: string; cards: PromptCard[] }[] {
  return STATIC_VAULT_COLLECTION_SERIES.flatMap((series) => {
    const first = series[0]
    if (!first) return []
    const meta = VAULT_COLLECTION_META.find((entry) => entry.previewCardId === first.id)
    return [{ title: meta?.name || first.title, cards: series }]
  })
}

function toLook(card: PromptCard): VaultMayaLook {
  return {
    cardKey: card.id,
    number: card.number,
    title: card.title,
    mood: card.mood,
    exampleImage: card.exampleImage || null,
  }
}

/** Full catalog, newest published drops first, then the static series. No prompt text. */
export async function getVaultMayaCollections(): Promise<VaultMayaCollection[]> {
  const published = await getPublishedVaultCollections().catch(() => [])
  const fromDb: VaultMayaCollection[] = published.map((collection, index) => ({
    slug: collection.slug,
    title: collection.title,
    moodLine: collection.moodLine,
    heroImage: collection.heroImage || collection.cards[0]?.exampleImage || null,
    aestheticId: toAestheticId(collection.title),
    isWeeklyDrop: index === 0,
    looks: collection.cards.map(toLook),
  }))
  const fromStatic: VaultMayaCollection[] = staticCollections().map((collection) => ({
    slug: toAestheticId(collection.title),
    title: collection.title,
    moodLine: collection.cards[0]?.mood || "",
    heroImage: collection.cards[0]?.exampleImage || null,
    aestheticId: toAestheticId(collection.title),
    isWeeklyDrop: false,
    looks: collection.cards.map(toLook),
  }))
  return [...fromDb, ...fromStatic]
}

/** Resolve one look card (with its prompt) by cardKey across DB + static sources. */
export async function findVaultMayaCard(cardKey: string): Promise<ResolvedCard | null> {
  const key = cardKey.trim()
  if (!key) return null

  const published = await getPublishedVaultCollections().catch(() => [])
  for (const collection of published) {
    const card = collection.cards.find((c) => c.id === key)
    if (card) {
      return { card, collectionTitle: collection.title, aestheticId: toAestheticId(collection.title) }
    }
  }
  for (const collection of staticCollections()) {
    const card = collection.cards.find((c) => c.id === key)
    if (card) {
      return { card, collectionTitle: collection.title, aestheticId: toAestheticId(collection.title) }
    }
  }
  return null
}

/**
 * Build the generation brief for a vault look. The stripped vault prompt is the scene
 * foundation; the short fields defer to it so nothing conflicts with the proven look.
 */
export function buildVaultMayaBrief(card: PromptCard): CreativeBrief {
  const sceneTemplate = stripIdentityParagraph(card.prompt).trim()
  return {
    outfit: "exactly the wardrobe described in the scene foundation",
    setting: "exactly the setting described in the scene foundation",
    mood: card.mood || "calm, editorial, true to the scene foundation",
    pose: "as directed in the scene foundation",
    cameraSpec: "",
    lighting: "",
    sceneTemplate,
  }
}
