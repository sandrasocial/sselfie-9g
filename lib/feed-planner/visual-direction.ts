export const FEED_VISUAL_DIRECTION_MODES = ["maya", "curated", "custom", "inspiration"] as const

export type FeedVisualDirectionMode = (typeof FEED_VISUAL_DIRECTION_MODES)[number]

export function normalizeVisualDirectionMode(value: unknown): FeedVisualDirectionMode {
  return FEED_VISUAL_DIRECTION_MODES.includes(value as FeedVisualDirectionMode)
    ? (value as FeedVisualDirectionMode)
    : "maya"
}

export function normalizeVisualDirectionBrief(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim().slice(0, 500)
  return trimmed.length >= 10 ? trimmed : null
}

export function normalizeInspirationImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2_000) return null
  try {
    const url = new URL(value)
    return url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com")
      ? url.toString()
      : null
  } catch {
    return null
  }
}
