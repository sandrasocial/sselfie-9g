/**
 * Feed Planner — User Selection Mapper
 *
 * SINGLE SOURCE OF TRUTH for onboarding UI selections → system parameters.
 * Visual Aesthetic → category
 * Feed Style → mood
 */
import { mapVisualAestheticToCategory } from "./generation-helpers"

export type ResolvedCategory = "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
export type ResolvedMood = "luxury" | "minimal" | "beige"

export interface UserSelectionInput {
  visualAesthetic?: string | unknown[] | null
  feedStyle?: string | null
}

export interface ResolvedSelection {
  category: ResolvedCategory
  mood: ResolvedMood
  visualAestheticRaw?: string
  feedStyleRaw?: string
  source: "mapped" | "default"
}

const FEED_STYLE_TO_MOOD: Record<string, ResolvedMood> = {
  "dark & moody": "luxury",
  "dark moody": "luxury",
  "dark_moody": "luxury",
  "dark": "luxury",
  "moody": "luxury",
  "light & minimalistic": "minimal",
  "light minimalistic": "minimal",
  "light_minimalistic": "minimal",
  "light minimal": "minimal",
  "minimal": "minimal",
  "minimalistic": "minimal",
  "beige aesthetic": "beige",
  "beige_aesthetic": "beige",
  "beige": "beige",
}

function normalizeSelectionList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean)
      }
    } catch {
      return value.trim() ? [value.trim()] : []
    }
  }
  return []
}

function resolveMoodFromFeedStyle(feedStyle?: string | null): ResolvedMood | null {
  if (!feedStyle) return null
  const normalized = feedStyle.toLowerCase().trim()
  if (FEED_STYLE_TO_MOOD[normalized]) {
    return FEED_STYLE_TO_MOOD[normalized]
  }
  if (normalized.includes("dark") || normalized.includes("moody")) return "luxury"
  if (normalized.includes("light") || normalized.includes("minimal")) return "minimal"
  if (normalized.includes("beige")) return "beige"
  return null
}

export function resolveUserSelections(
  input: UserSelectionInput,
  defaults: { category: ResolvedCategory; mood: ResolvedMood }
): ResolvedSelection {
  const visualAesthetics = normalizeSelectionList(input.visualAesthetic)
  const feedStyleRaw = input.feedStyle || null

  const visualAestheticRaw = visualAesthetics[0]
  const mappedCategory =
    mapVisualAestheticToCategory(visualAestheticRaw) || defaults.category
  const mappedMood = resolveMoodFromFeedStyle(feedStyleRaw) || defaults.mood

  return {
    category: mappedCategory,
    mood: mappedMood,
    visualAestheticRaw,
    feedStyleRaw: feedStyleRaw || undefined,
    source: visualAestheticRaw || feedStyleRaw ? "mapped" : "default",
  }
}
