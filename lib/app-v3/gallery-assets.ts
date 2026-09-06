import type { GalleryImage } from "@/lib/data/images"

export type AppV3GalleryContentType =
  | "photo"
  | "photoshoot"
  | "reel-cover"
  | "carousel"
  | "story-slide"
  | "video"
  | "unknown"

export type AppV3GalleryAsset = {
  description?: string
  labels?: string
  isUsed?: boolean
  id: string
  kind: "image" | "video"
  contentType: AppV3GalleryContentType
  url: string
  thumbnailUrl?: string | null
  sourceImageUrl?: string | null
  createdAt: string
  isFavorite: boolean
  title?: string | null
  variantOf?: string | null
  prompt?: string | null
  motionPrompt?: string | null
  status?: string | null
  /** Internal generation correlation key used for exact lost-response recovery. */
  generationRef?: string | null
  /** Exact Vault Maya look that produced this image, when applicable. */
  vaultMayaCardKey?: string | null
  canFavorite: boolean
  canDelete: boolean
  canDownload: boolean
  canMakeMotion: boolean
}

export type AppV3GalleryCounts = {
  all: number
  favorites: number
  photos: number
  photoshoots: number
  reelCovers: number
  carousels: number
  storySlides: number
  videos: number
}

export type GalleryVideoRow = {
  id: unknown
  image_source?: unknown
  video_url?: unknown
  motion_prompt?: unknown
  status?: unknown
  created_at?: unknown
  completed_at?: unknown
}

export type ParsedGalleryAssetId =
  | { kind: "ai"; numericId: number }
  | { kind: "gen"; numericId: number }
  | { kind: "video"; numericId: number }

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function isHttpUrl(value: unknown): value is string {
  return typeof value === "string" && value.trim().startsWith("http")
}

function createdAtString(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "string" && value.trim()) return value
  return new Date(0).toISOString()
}

function vaultMayaCardKeyFromStyle(value: unknown): string | null {
  const style = cleanString(value)
  return style.startsWith("vault-maya:") ? style.slice("vault-maya:".length) || null : null
}

export function parseGalleryAssetId(assetId: unknown): ParsedGalleryAssetId | null {
  if (typeof assetId !== "string") return null
  const match = assetId.trim().match(/^(ai|gen|video)_(\d+)$/)
  if (!match) return null
  const numericId = Number.parseInt(match[2], 10)
  if (!Number.isFinite(numericId) || numericId <= 0) return null
  return { kind: match[1] as ParsedGalleryAssetId["kind"], numericId }
}

export function inferGalleryContentType(input: {
  kind: "image" | "video"
  category?: unknown
  source?: unknown
  prompt?: unknown
}): AppV3GalleryContentType {
  if (input.kind === "video") return "video"

  const category = cleanString(input.category).toLowerCase()
  const source = cleanString(input.source).toLowerCase()
  const prompt = cleanString(input.prompt).toLowerCase()

  // Rows written since 2026-07-06 store the real output format in `category` — trust it
  // directly. The keyword sniffing below stays only for legacy rows whose category is a
  // coarse bucket ('concept' / 'edit' / 'text-bake' / 'openai').
  switch (category) {
    case "photo":
      return "photo"
    case "photoshoot":
      return "photoshoot"
    case "carousel":
      return "carousel"
    case "story-slide":
    case "story-sequence":
      return "story-slide"
    case "reel-cover":
      return "reel-cover"
  }

  const haystack = [category, source, prompt].filter(Boolean).join(" ")

  if (haystack.includes("photoshoot") || haystack.includes("shoot")) return "photoshoot"
  if (haystack.includes("carousel")) return "carousel"
  if (haystack.includes("story")) return "story-slide"
  if (haystack.includes("reel") || haystack.includes("cover")) return "reel-cover"
  if (category === "concept" || category === "edit" || source.includes("openai")) return "photo"
  if (category || source || prompt) return "photo"
  return "unknown"
}

export function imageToGalleryAsset(image: GalleryImage): AppV3GalleryAsset | null {
  if (!isHttpUrl(image.image_url)) return null
  return {
    id: image.id,
    kind: "image",
    contentType: inferGalleryContentType({
      kind: "image",
      category: image.category,
      source: image.source,
      prompt: image.prompt,
    }),
    url: image.image_url.trim(),
    thumbnailUrl: image.image_url.trim(),
    sourceImageUrl: null,
    createdAt: createdAtString(image.created_at),
    isFavorite: Boolean(image.is_favorite),
    title: image.title || null,
    variantOf: image.variant_of ? `ai_${image.variant_of}` : null,
    prompt: image.prompt || null,
    motionPrompt: null,
    status: null,
    generationRef: cleanString(image.prediction_id) || null,
    vaultMayaCardKey: vaultMayaCardKeyFromStyle(image.style),
    canFavorite: image.id.startsWith("ai_") || image.id.startsWith("gen_"),
    canDelete: image.id.startsWith("ai_") || image.id.startsWith("gen_"),
    canDownload: true,
    canMakeMotion: true,
  }
}

export function videoToGalleryAsset(row: GalleryVideoRow): AppV3GalleryAsset | null {
  if (!isHttpUrl(row.video_url)) return null
  const id = Number(row.id)
  if (!Number.isFinite(id) || id <= 0) return null
  const sourceImageUrl = isHttpUrl(row.image_source) ? row.image_source.trim() : null
  return {
    id: `video_${id}`,
    kind: "video",
    contentType: "video",
    url: row.video_url.trim(),
    thumbnailUrl: sourceImageUrl,
    sourceImageUrl,
    createdAt: createdAtString(row.completed_at || row.created_at),
    isFavorite: false,
    prompt: null,
    motionPrompt: cleanString(row.motion_prompt) || null,
    status: cleanString(row.status) || null,
    canFavorite: false,
    canDelete: true,
    canDownload: true,
    canMakeMotion: false,
  }
}

export function buildGalleryCounts(assets: AppV3GalleryAsset[]): AppV3GalleryCounts {
  return {
    all: assets.length,
    favorites: assets.filter(asset => asset.isFavorite).length,
    photos: assets.filter(asset => asset.kind === "image" && asset.contentType === "photo").length,
    photoshoots: assets.filter(asset => asset.contentType === "photoshoot").length,
    reelCovers: assets.filter(asset => asset.contentType === "reel-cover").length,
    carousels: assets.filter(asset => asset.contentType === "carousel").length,
    storySlides: assets.filter(asset => asset.contentType === "story-slide").length,
    videos: assets.filter(asset => asset.kind === "video").length,
  }
}

export function sortGalleryAssets(assets: AppV3GalleryAsset[]): AppV3GalleryAsset[] {
  return [...assets].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime() || 0
    const timeB = new Date(b.createdAt).getTime() || 0
    return timeB - timeA
  })
}
