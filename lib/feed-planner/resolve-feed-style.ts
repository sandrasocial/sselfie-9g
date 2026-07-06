// Feed Planner Phase 2b — resolves a feed_style for the auto-draft without asking a question.
// Mirrors the exact heuristic components/feed-planner/feed-style-modal.tsx already uses when a
// feed is created without an explicit style choice: match the member's stored settings/visual
// preference against the curated style names, case-insensitively, else fall back to the same
// literal default the modal itself falls back to ("Dark & Moody"). Never blocks on a question -
// this is a stylistic default the member can change with one Maya chat turn afterward.

import { CURATED_FEED_STYLE_MAP, type CuratedFeedStyleName } from "@/lib/style-presets"
import { getFeedStyleV2ByName, getDefaultVariationId } from "@/lib/feed-planner/feed-style-prompt-loader"

const DEFAULT_STYLE: CuratedFeedStyleName = "Dark & Moody"
const CURATED_NAMES = Object.keys(CURATED_FEED_STYLE_MAP) as CuratedFeedStyleName[]

function matchCuratedName(candidates: unknown[]): CuratedFeedStyleName | null {
  for (const candidate of candidates) {
    if (typeof candidate !== "string" || !candidate.trim()) continue
    const value = candidate.trim().toLowerCase()
    const match = CURATED_NAMES.find(name => name.toLowerCase() === value)
    if (match) return match
  }
  return null
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(v => String(v))
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.map(v => String(v))
    } catch {
      // not JSON, ignore
    }
  }
  return []
}

export interface ResolvedFeedStyle {
  feedStyle: CuratedFeedStyleName
  styleId: number
  variationId: number | null
}

/**
 * personalBrand is whatever getUserPersonalBrand() returns - untyped here to avoid a hard
 * dependency on that module's exact shape, matching how get-user-context.ts treats it.
 */
export async function resolveFeedStyleForUser(personalBrand: {
  settings_preference?: unknown
  visual_aesthetic?: unknown
  brand_vibe?: unknown
} | null): Promise<ResolvedFeedStyle> {
  const settingsPreference = parseStringArray(personalBrand?.settings_preference)
  const visualAesthetic = parseStringArray(personalBrand?.visual_aesthetic)
  const brandVibe = typeof personalBrand?.brand_vibe === "string" ? [personalBrand.brand_vibe] : []

  const feedStyle =
    matchCuratedName(settingsPreference) ||
    matchCuratedName(visualAesthetic) ||
    matchCuratedName(brandVibe) ||
    DEFAULT_STYLE

  const style = (await getFeedStyleV2ByName(feedStyle)) ?? (await getFeedStyleV2ByName(DEFAULT_STYLE))
  if (!style || !style.enabled) {
    // Should not happen in practice (the default style is always seeded/enabled), but never
    // leave feed_style unset - that's exactly the state that throws FEED_STYLE_REQUIRED later.
    throw new Error(`resolveFeedStyleForUser: no enabled feed style available (tried "${feedStyle}")`)
  }

  const variationId = await getDefaultVariationId(style.id)
  return { feedStyle: style.name as CuratedFeedStyleName, styleId: style.id, variationId }
}
