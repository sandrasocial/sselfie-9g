// SSELFIE Studio 3.0 — Vault Style Bridge (MAYA-REBUILD-08).
//
// The Prompt Vault is the look we actually want. Its rich, tested editorial prompts live in
// lib/ai-prompts/prompt-data.ts (the same source the Vault access page renders to buyers, and
// the same source the /app aesthetics are derived from). Until now Maya only saw a collection's
// NAME + thumbnail, so she invented generic, posed studio prompts. This module connects the real
// Vault prompts to Maya so she understands each aesthetic fully and her output matches the Vault.
//
// It auto-syncs: every new collection added to prompt-data.ts (per the Add-Collection SOP) flows
// to Maya here with no extra work. Matching mirrors aesthetic-recipes.ts (loose id regex), so the
// front-door aesthetic id (components/app-v3/aesthetics.ts toId) resolves to its collection.
//
// IMPORTANT (per the Maya x Vault bridge brief): the Vault prompts open with a "use my uploaded
// selfie as the identity reference" paragraph written for paste-into-ChatGPT use. /app preserves
// identity differently (it attaches the selfie to the gpt-image edit endpoint and prepends its own
// IDENTITY_ANCHOR), so we STRIP that identity paragraph and keep only the styling DNA: scene,
// outfit, hair, makeup, lighting, camera, color grading, and the avoid list.

import {
  type PromptCard,
  MYSTERIOUS_VOGUE_SERIES,
  QUIET_LUXURY_LONDON_SERIES,
  NOIR_FEMME_SERIES,
  CLEAN_GIRL_MORNING_SERIES,
  DARK_FEMININE_CAFE_SERIES,
  DARK_BALCONY_SERIES,
  COASTAL_WHITE_SERIES,
  COZY_LEATHER_SERIES,
  DENIM_STREET_SERIES,
  MARBLE_CAFE_SERIES,
} from "@/lib/ai-prompts/prompt-data"

export interface VaultStyle {
  /** Canonical id (aligns with the front-door aesthetic id where possible). */
  id: string
  /** Human label. */
  name: string
  /** Loose matcher against an aesthetic id (handles "founder"/accent drift). */
  match: RegExp
  /** The full collection of tested Vault prompt cards. */
  cards: PromptCard[]
}

// Newest collections can be appended; order does not matter (resolution is by regex match).
const VAULT_STYLES: VaultStyle[] = [
  { id: "mysterious-vogue", name: "Mysterious Vogue", match: /mysterious-vogue/, cards: MYSTERIOUS_VOGUE_SERIES },
  { id: "quiet-luxury-london", name: "Quiet Luxury London", match: /quiet-luxury-london/, cards: QUIET_LUXURY_LONDON_SERIES },
  { id: "noir-femme", name: "Noir Femme", match: /noir-femme/, cards: NOIR_FEMME_SERIES },
  { id: "clean-girl-morning", name: "Clean Girl Founder Morning", match: /clean-girl/, cards: CLEAN_GIRL_MORNING_SERIES },
  { id: "dark-feminine-cafe", name: "Dark Feminine Café Coffee-Run", match: /dark-feminine-caf/, cards: DARK_FEMININE_CAFE_SERIES },
  { id: "dark-balcony", name: "Dark Balcony Luxury City", match: /dark-balcony/, cards: DARK_BALCONY_SERIES },
  { id: "coastal-white", name: "Coastal White Dress Sunset", match: /coastal-white/, cards: COASTAL_WHITE_SERIES },
  { id: "cozy-leather", name: "Cozy Leather + Oversized Knit", match: /cozy-leather/, cards: COZY_LEATHER_SERIES },
  { id: "denim-street", name: "Soft Blazer + Light Denim Street", match: /denim|blazer/, cards: DENIM_STREET_SERIES },
  { id: "marble-cafe", name: "Marble Café Wine", match: /marble/, cards: MARBLE_CAFE_SERIES },
]

/** Resolve the Vault collection for a chosen front-door aesthetic id (loose match), or null. */
export function getVaultStyle(aestheticId?: string | null): VaultStyle | null {
  if (!aestheticId) return null
  const key = aestheticId.toLowerCase().trim()
  return VAULT_STYLES.find((s) => s.match.test(key)) ?? null
}

/** Collapse whitespace. */
function tidy(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

/**
 * Remove the leading identity-lock paragraph from a Vault prompt (the "use my uploaded selfie /
 * preserve my real facial features / recognizable as me" block). /app handles identity its own
 * way, so we keep only the styling DNA. Returns the prompt body with that paragraph removed.
 */
export function stripIdentityParagraph(prompt: string): string {
  const paragraphs = prompt.split(/\n\s*\n/)
  const identityRe = /uploaded selfie|identity reference|preserve my|recognizable as me|do not change my face|the same woman/i
  const kept = paragraphs.filter((p, i) => !(i === 0 && identityRe.test(p)))
  return tidy(kept.join("\n\n").replace(/\n{3,}/g, "\n\n"))
}

/**
 * The styling guide injected into Maya's system prompt: the real Vault shots for a chosen vibe so
 * she understands the aesthetic fully and authors briefs that mirror these shoots (candid, on
 * location, real props), not generic posed studio stock. Identity paragraph stripped per shot.
 */
export function getVaultStyleGuide(aestheticId?: string | null, maxShots = 8): string | null {
  const style = getVaultStyle(aestheticId)
  if (!style || style.cards.length === 0) return null
  const shots = style.cards.slice(0, maxShots).map((card, i) => {
    const dna = stripIdentityParagraph(card.prompt)
    return [
      `Shot ${i + 1} — ${tidy(card.title)}`,
      card.whenToUse ? `When to use: ${tidy(card.whenToUse)}` : "",
      `Look: ${dna}`,
    ]
      .filter(Boolean)
      .join("\n")
  })
  return [
    `## VAULT STYLING GUIDE — "${style.name}" (this is the exact look she chose; match it)`,
    "",
    "These are the real, tested SSELFIE Vault shots for this collection. They are your source of",
    "truth for the look: candid, on location, with real settings and real props (a coffee cup, a",
    "bag, a doorway, movement), photographed like an editorial day, not posed studio portraits.",
    "When you write each concept brief, mirror the SCENE, SETTING, OUTFIT, PROPS, POSE energy,",
    "LIGHTING, and COLOR GRADING of these shots. Vary the shots across a set the way these do; do",
    "not repeat one pose. Keep the content angle (the topic) about HER brand, but the visual look",
    "must read like these Vault shots.",
    "",
    shots.join("\n\n"),
  ].join("\n")
}

/**
 * The fallback styling guide for GENERAL sessions (a Content idea, Brand & memory, any aesthetic
 * id that maps to no collection — e.g. "maya-general"). Without this, those paths injected NO
 * Vault DNA at all and Maya drifted to generic posed-studio output. Maya is told to pick the one
 * collection that best fits her brand + the topic, then ground every brief in that collection.
 * One full example shot per collection keeps the token cost close to a single-collection guide.
 */
export function getVaultOverviewGuide(maxPerCollection = 1): string | null {
  const sections = VAULT_STYLES.filter((s) => s.cards.length > 0).map((style) => {
    const signature = getVaultSignatureDna(style.id)
    const shots = style.cards
      .slice(0, maxPerCollection)
      .map((card) => `Example — ${tidy(card.title)}: ${stripIdentityParagraph(card.prompt)}`)
    return [`### ${style.name}`, signature ?? "", ...shots].filter(Boolean).join("\n")
  })
  if (sections.length === 0) return null
  return [
    `## VAULT STYLING GUIDE — all collections (she has not picked one look yet)`,
    "",
    "These are the real, tested SSELFIE Vault collections. She started from an idea or topic",
    "instead of a chosen look, so FIRST pick the ONE collection that best fits her brand, the",
    "topic, and the mood she's describing. Then ground every concept brief in that collection's",
    "DNA: scene, setting, outfit, props, pose energy, lighting, and color grading. Candid, on",
    "location, real props, photographed like an editorial day. Never invent a generic posed",
    "studio look; every brief must read like it belongs to one of these collections.",
    "",
    sections.join("\n\n"),
  ].join("\n")
}

/**
 * A compact style signature for the compiler: the recurring mood/styling tokens across the whole
 * collection (from each card's `mood` line). Auto-derived so it stays in sync, used to ground the
 * generated photo in the collection's real DNA even if a brief is thin.
 */
export function getVaultSignatureDna(aestheticId?: string | null): string | null {
  const style = getVaultStyle(aestheticId)
  if (!style || style.cards.length === 0) return null
  const seen = new Set<string>()
  const tokens: string[] = []
  for (const card of style.cards) {
    for (const raw of (card.mood || "").split("·")) {
      const t = tidy(raw).toLowerCase()
      if (t && !seen.has(t)) {
        seen.add(t)
        tokens.push(t)
      }
    }
  }
  if (tokens.length === 0) return null
  return `Signature of the "${style.name}" Vault collection: ${tokens.slice(0, 14).join(", ")}.`
}
