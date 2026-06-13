import "server-only"

import {
  getVaultOverviewGuide as getStaticVaultOverviewGuide,
  getVaultStyleGuide as getStaticVaultStyleGuide,
  stripIdentityParagraph,
} from "@/lib/app-v3/maya/vault-styles"
import { getPublishedVaultCollections, toAestheticId, toDisplayName } from "@/lib/vault/published-collections"
import type { PromptCard } from "@/lib/ai-prompts/prompt-data"

function tidy(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

function buildStyleGuide(name: string, cards: PromptCard[], maxShots: number): string | null {
  if (cards.length === 0) return null
  const shots = cards.slice(0, maxShots).map((card, i) => {
    const dna = stripIdentityParagraph(card.prompt)
    return [
      `Shot ${i + 1} - ${tidy(card.title)}`,
      card.whenToUse ? `When to use: ${tidy(card.whenToUse)}` : "",
      `Look: ${dna}`,
    ]
      .filter(Boolean)
      .join("\n")
  })
  return [
    `## VAULT STYLING GUIDE - "${name}" (this is the exact look she chose; match it)`,
    "",
    "These are the real, tested SSELFIE Vault shots for this collection. They are your source of",
    "truth for the look: candid, on location, with real settings and real props. When you write",
    "each concept brief, mirror the scene, setting, outfit, props, pose energy, lighting, and",
    "color grading of these shots. Vary the set. Do not repeat one pose.",
    "",
    shots.join("\n\n"),
  ].join("\n")
}

export async function getVaultStyleGuide(aestheticId?: string | null, maxShots = 8): Promise<string | null> {
  if (aestheticId) {
    const key = aestheticId.toLowerCase().trim()
    const published = await getPublishedVaultCollections()
    const match = published.find((collection) => {
      const id = toAestheticId(collection.title)
      return key === id || key === collection.slug || key.includes(id) || collection.slug.includes(key)
    })
    if (match) return buildStyleGuide(toDisplayName(match.title), match.cards, maxShots)
  }
  return getStaticVaultStyleGuide(aestheticId, maxShots)
}

export async function getVaultOverviewGuide(maxPerCollection = 1): Promise<string | null> {
  const published = await getPublishedVaultCollections()
  const dynamicSections = published.map((collection) => {
    const shots = collection.cards
      .slice(0, maxPerCollection)
      .map((card) => `Example - ${tidy(card.title)}: ${stripIdentityParagraph(card.prompt)}`)
    return [`### ${toDisplayName(collection.title)}`, collection.moodLine, ...shots].filter(Boolean).join("\n")
  })
  const staticOverview = getStaticVaultOverviewGuide(maxPerCollection)
  if (dynamicSections.length === 0) return staticOverview
  return [
    `## VAULT STYLING GUIDE - all collections (she has not picked one look yet)`,
    "",
    "These are the real, tested SSELFIE Vault collections, including newly published drops.",
    "First pick the one collection that best fits her brand, topic, and mood. Then ground every",
    "concept brief in that collection's DNA: scene, styling, props, movement, lighting, and grade.",
    "",
    dynamicSections.join("\n\n"),
    staticOverview ? `\n\n${staticOverview}` : "",
  ].join("")
}
