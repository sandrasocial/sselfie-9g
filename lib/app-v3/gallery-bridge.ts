export type GalleryImageRow = {
  image_url?: unknown
  created_at?: unknown
}

export type LegacyGeneratedImageRow = {
  selected_url?: unknown
  image_urls?: unknown
  created_at?: unknown
}

function isHttpUrl(value: unknown): value is string {
  return typeof value === "string" && value.trim().startsWith("http")
}

function collectHttpUrls(value: unknown, urls: string[] = []): string[] {
  if (!value) return urls

  if (Array.isArray(value)) {
    for (const item of value) collectHttpUrls(item, urls)
    return urls
  }

  if (typeof value === "object") {
    const outputKeys = new Set([
      "finalImageUrls",
      "imageUrls",
      "image_urls",
      "output",
      "outputs",
      "url",
      "urls",
    ])
    const containerKeys = new Set(["predictions", "frames", "results", "images"])
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      if (outputKeys.has(key) || containerKeys.has(key)) collectHttpUrls(nestedValue, urls)
    }
    return urls
  }

  if (typeof value !== "string") return urls

  const trimmed = value.trim()
  if (!trimmed) return urls

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      collectHttpUrls(JSON.parse(trimmed), urls)
      return urls
    } catch {
      // Fall through to comma/brace cleanup for malformed legacy payloads.
    }
  }

  for (const part of trimmed.split(",")) {
    const cleaned = part.trim().replace(/^["'{\[]+|["'}\]]+$/g, "")
    if (isHttpUrl(cleaned)) urls.push(cleaned)
  }

  return urls
}

function extractLegacyGeneratedUrls(row: LegacyGeneratedImageRow): string[] {
  const urls: string[] = []
  collectHttpUrls(row.selected_url, urls)
  collectHttpUrls(row.image_urls, urls)
  return urls
}

function toCreatedAtMs(value: unknown): number {
  return new Date(String(value || 0)).getTime() || 0
}

export function mergeGalleryImageUrls({
  aiRows,
  legacyRows,
  limit = 60,
}: {
  aiRows: GalleryImageRow[]
  legacyRows: LegacyGeneratedImageRow[]
  limit?: number
}): string[] {
  const seen = new Set<string>()
  const images: string[] = []
  const candidates: Array<{ url: string; createdAt: number }> = []

  for (const row of aiRows) {
    if (isHttpUrl(row.image_url)) {
      candidates.push({ url: row.image_url.trim(), createdAt: toCreatedAtMs(row.created_at) })
    }
  }

  for (const row of legacyRows) {
    const createdAt = toCreatedAtMs(row.created_at)
    for (const url of extractLegacyGeneratedUrls(row)) candidates.push({ url, createdAt })
  }

  candidates.sort((a, b) => b.createdAt - a.createdAt)

  for (const candidate of candidates) {
    if (seen.has(candidate.url)) continue
    seen.add(candidate.url)
    images.push(candidate.url)
    if (images.length >= limit) break
  }

  return images
}
