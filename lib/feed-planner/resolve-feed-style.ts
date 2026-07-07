// Feed Planner - resolves the member's feed style (the template world her whole grid lives
// in) without ever asking a blocking question. Resolution order:
//   1. What she told Maya ("preferred_feed_style" in maya_personal_memory) - Maya saves this
//      via the chat remember tool when the member expresses a style/color/mood direction.
//   2. An exact curated-name match in her stored preferences (the old picker wrote these).
//   3. Signal scoring: her onboarding answers (aesthetic, fashion, vibe, colors, settings)
//      scored against each curated style's keyword profile - Maya choosing FOR her from
//      what she said about herself, instead of everyone landing on one default.
//   4. The platform default ("Dark & Moody") only when there's no signal at all.

import { CURATED_FEED_STYLE_MAP, type CuratedFeedStyleName } from "@/lib/style-presets"
import { getFeedStyleV2ByName, getDefaultVariationId } from "@/lib/feed-planner/feed-style-prompt-loader"
import { sql } from "@/lib/db/client"

const DEFAULT_STYLE: CuratedFeedStyleName = "Dark & Moody"
const CURATED_NAMES = Object.keys(CURATED_FEED_STYLE_MAP) as CuratedFeedStyleName[]

/** Keyword profile per curated style, scored against the member's own onboarding words. */
const STYLE_SIGNALS: Record<CuratedFeedStyleName, string[]> = {
  "Dark & Moody": ["dark", "moody", "dramatic", "urban", "night", "black", "edgy", "cinematic", "shadow", "bold"],
  "Beige Aesthetic": ["beige", "cream", "warm", "neutral", "cozy", "earthy", "tan", "brown", "caramel", "soft"],
  "Light & Minimalistic": ["light", "minimal", "clean", "white", "bright", "airy", "scandinavian", "simple", "fresh", "crisp"],
  "Luxury Future Self": ["luxury", "elegant", "gold", "rich", "high-end", "sophisticated", "glam", "expensive", "editorial", "marble", "designer"],
  "Casual Bohemian": ["boho", "bohemian", "casual", "relaxed", "natural", "free-spirited", "artistic", "vintage", "handmade", "linen"],
  "Athletic & Wellness": ["athletic", "wellness", "fitness", "active", "gym", "yoga", "health", "sport", "movement", "energy"],
  "Coastal Aesthetics": ["coastal", "beach", "ocean", "sea", "breezy", "summer", "vacation", "mediterranean", "nautical", "sand"],
}

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
      // not JSON - the raw string itself still carries signal words
      return [value]
    }
  }
  return []
}

/** Score the member's combined brand text against each style's keyword profile. */
export function scoreFeedStyle(brandText: string): { style: CuratedFeedStyleName; score: number } | null {
  const text = brandText.toLowerCase()
  if (!text.trim()) return null
  let best: { style: CuratedFeedStyleName; score: number } | null = null
  for (const style of CURATED_NAMES) {
    let score = 0
    for (const keyword of STYLE_SIGNALS[style]) {
      if (text.includes(keyword)) score += 1
    }
    if (score > 0 && (!best || score > best.score)) best = { style, score }
  }
  return best
}

/** The style the member expressed to Maya in conversation, if any. */
async function getPreferredFeedStyle(userId: number | string | null | undefined): Promise<CuratedFeedStyleName | null> {
  if (userId == null) return null
  try {
    const [row] = await sql`
      SELECT memory_data->>'preferred_feed_style' AS style
      FROM maya_personal_memory
      WHERE user_id = ${String(userId)}
      LIMIT 1
    `
    return matchCuratedName([row?.style])
  } catch {
    return null
  }
}

export interface ResolvedFeedStyle {
  feedStyle: CuratedFeedStyleName
  styleId: number
  variationId: number | null
}

/**
 * personalBrand is whatever getUserPersonalBrand() returns - untyped here to avoid a hard
 * dependency on that module's exact shape, matching how get-user-context.ts treats it.
 * Pass userId to honor a style the member expressed to Maya (highest priority).
 */
export async function resolveFeedStyleForUser(
  personalBrand: {
    settings_preference?: unknown
    visual_aesthetic?: unknown
    fashion_style?: unknown
    brand_vibe?: unknown
    color_mood?: unknown
    color_theme?: unknown
  } | null,
  userId?: number | string | null,
): Promise<ResolvedFeedStyle> {
  const settingsPreference = parseStringArray(personalBrand?.settings_preference)
  const visualAesthetic = parseStringArray(personalBrand?.visual_aesthetic)
  const fashionStyle = parseStringArray(personalBrand?.fashion_style)
  const brandVibe = typeof personalBrand?.brand_vibe === "string" ? [personalBrand.brand_vibe] : []
  const colorMood = typeof personalBrand?.color_mood === "string" ? [personalBrand.color_mood] : []
  const colorTheme = typeof personalBrand?.color_theme === "string" ? [personalBrand.color_theme] : []

  const preferred = await getPreferredFeedStyle(userId)
  const exactMatch =
    matchCuratedName(settingsPreference) ||
    matchCuratedName(visualAesthetic) ||
    matchCuratedName(brandVibe)
  const scored = scoreFeedStyle(
    [...settingsPreference, ...visualAesthetic, ...fashionStyle, ...brandVibe, ...colorMood, ...colorTheme].join(" "),
  )

  const feedStyle = preferred || exactMatch || scored?.style || DEFAULT_STYLE

  const style = (await getFeedStyleV2ByName(feedStyle)) ?? (await getFeedStyleV2ByName(DEFAULT_STYLE))
  if (!style || !style.enabled) {
    // Should not happen in practice (the default style is always seeded/enabled), but never
    // leave feed_style unset - that's exactly the state that throws FEED_STYLE_REQUIRED later.
    throw new Error(`resolveFeedStyleForUser: no enabled feed style available (tried "${feedStyle}")`)
  }

  const variationId = await getDefaultVariationId(style.id)
  return { feedStyle: style.name as CuratedFeedStyleName, styleId: style.id, variationId }
}

/**
 * Persist a style the member expressed to Maya, and switch her CURRENT month's plan to it so
 * the template world changes immediately (only layouts with no generated images yet - a grid
 * that already has real photos in one world keeps them; the new style applies from now on).
 */
export async function savePreferredFeedStyle(
  userId: number | string,
  styleName: string,
  options?: {
    /** Set false when the caller already restyled the layout itself (e.g. the update-style
     *  route, which applies the member's EXACT variation pick - the default-variation
     *  restyle here would overwrite it). Memory is always written. */
    restyleCurrentMonth?: boolean
  },
): Promise<CuratedFeedStyleName | null> {
  const matched = matchCuratedName([styleName])
  if (!matched) return null

  const { mergeMayaMemoryData } = await import("@/lib/maya/memory-store")
  await mergeMayaMemoryData(userId, { preferred_feed_style: matched })

  if (options?.restyleCurrentMonth === false) return matched

  try {
    const style = await getFeedStyleV2ByName(matched)
    if (style?.enabled) {
      const variationId = await getDefaultVariationId(style.id)
      await sql`
        UPDATE feed_layouts
        SET feed_style = ${style.name}, feed_style_variation_id = ${variationId}
        WHERE user_id = ${String(userId)}
          AND period_month IS NOT NULL
          AND period_month = to_char(NOW(), 'YYYY-MM')
      `
    }
  } catch (e) {
    console.error("[feed-style] current-month restyle skipped:", e)
  }
  return matched
}
