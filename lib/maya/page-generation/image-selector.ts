import { sql } from "@/lib/db/client"
import { sanitizeUserFacingText } from "@/lib/maya/page-generation/sanitizers"

const MAX_IMAGE_CANDIDATES = 24
const MAX_SUPPORT_IMAGES = 2

type ImageSource = "brand_assets" | "generated_images" | "ai_images"

interface ImageCandidate {
  url: string
  source: ImageSource
  createdAt: string
  prompt: string
  score: number
}

export interface MayaLandingImageSelection {
  heroImageUrl: string
  supportImageUrls: string[]
  rankedCandidates: ImageCandidate[]
}

function normalizeUrl(value: unknown): string {
  if (typeof value !== "string") return ""
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith("/")) return ""
  return trimmed
}

function uniqueByUrl<T extends { url: string }>(values: T[]): T[] {
  const seen = new Set<string>()
  const deduped: T[] = []

  for (const candidate of values) {
    if (!candidate.url || seen.has(candidate.url)) continue
    seen.add(candidate.url)
    deduped.push(candidate)
  }

  return deduped
}

function isLikelyImageType(fileType: string): boolean {
  const normalized = fileType.toLowerCase()
  return (
    normalized.includes("image") ||
    normalized.includes("jpg") ||
    normalized.includes("jpeg") ||
    normalized.includes("png") ||
    normalized.includes("webp")
  )
}

function extractKeywords(value: string): string[] {
  const cleaned = sanitizeUserFacingText(value, 400)
  if (!cleaned) return []

  return Array.from(
    new Set(
      cleaned
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 4)
        .slice(0, 16),
    ),
  )
}

function sourceBaseScore(source: ImageSource): number {
  if (source === "brand_assets") return 70
  if (source === "generated_images") return 55
  return 45
}

function computeCandidateScore(candidate: Omit<ImageCandidate, "score">, index: number, keywords: string[]): number {
  const sourceScore = sourceBaseScore(candidate.source)
  const recencyScore = Math.max(0, 20 - index)

  let relevanceScore = 0
  if (keywords.length > 0) {
    const haystack = `${candidate.prompt} ${candidate.url}`.toLowerCase()
    for (const keyword of keywords) {
      if (haystack.includes(keyword)) relevanceScore += 3
    }
  }

  return sourceScore + recencyScore + relevanceScore
}

async function getGeneratedImageCandidates(userId: string): Promise<Omit<ImageCandidate, "score">[]> {
  try {
    const rows = await sql`
      SELECT selected_url, image_urls, prompt, created_at
      FROM generated_images
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${MAX_IMAGE_CANDIDATES}
    `

    const candidates: Omit<ImageCandidate, "score">[] = []

    for (const row of rows as Array<{ selected_url?: string | null; image_urls?: string[] | string | null; prompt?: string | null; created_at?: string | null }>) {
      const prompt = sanitizeUserFacingText(String(row.prompt || ""), 160)
      const createdAt = String(row.created_at || new Date(0).toISOString())

      const selected = normalizeUrl(row.selected_url)
      if (selected) {
        candidates.push({
          url: selected,
          source: "generated_images",
          createdAt,
          prompt,
        })
      }

      if (Array.isArray(row.image_urls)) {
        for (const imageUrl of row.image_urls) {
          const normalized = normalizeUrl(imageUrl)
          if (!normalized) continue
          candidates.push({
            url: normalized,
            source: "generated_images",
            createdAt,
            prompt,
          })
        }
      } else if (typeof row.image_urls === "string") {
        for (const imageUrl of row.image_urls.split(",")) {
          const normalized = normalizeUrl(imageUrl)
          if (!normalized) continue
          candidates.push({
            url: normalized,
            source: "generated_images",
            createdAt,
            prompt,
          })
        }
      }
    }

    return candidates
  } catch (error) {
    console.warn("[Landing Image Selector] generated_images query failed:", error)
    return []
  }
}

async function getAiImageCandidates(userId: string): Promise<Omit<ImageCandidate, "score">[]> {
  try {
    const rows = await sql`
      SELECT image_url, prompt, created_at
      FROM ai_images
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${MAX_IMAGE_CANDIDATES}
    `

    return (rows as Array<{ image_url?: string | null; prompt?: string | null; created_at?: string | null }>)
      .map((row) => ({
        url: normalizeUrl(row.image_url),
        source: "ai_images" as const,
        createdAt: String(row.created_at || new Date(0).toISOString()),
        prompt: sanitizeUserFacingText(String(row.prompt || ""), 160),
      }))
      .filter((row) => row.url)
  } catch {
    return []
  }
}

async function getBrandAssetCandidates(userId: string): Promise<Omit<ImageCandidate, "score">[]> {
  try {
    const rows = await sql`
      SELECT file_url, file_type, created_at, COALESCE(file_name, '') AS file_name
      FROM brand_assets
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${MAX_IMAGE_CANDIDATES}
    `

    return (rows as Array<{ file_url?: string | null; file_type?: string | null; created_at?: string | null; file_name?: string | null }>)
      .filter((row) => isLikelyImageType(String(row.file_type || "")))
      .map((row) => ({
        url: normalizeUrl(row.file_url),
        source: "brand_assets" as const,
        createdAt: String(row.created_at || new Date(0).toISOString()),
        prompt: sanitizeUserFacingText(String(row.file_name || ""), 120),
      }))
      .filter((row) => row.url)
  } catch (error) {
    console.warn("[Landing Image Selector] brand_assets query failed:", error)
    return []
  }
}

export async function selectLandingImages(input: {
  userId: string | number
  instruction: string
  styleHint?: string
  offerHint?: string
}): Promise<MayaLandingImageSelection> {
  const normalizedUserId = String(input.userId || "").trim()
  if (!normalizedUserId) {
    return {
      heroImageUrl: "",
      supportImageUrls: [],
      rankedCandidates: [],
    }
  }

  const [brandAssets, generatedImages, aiImages] = await Promise.all([
    getBrandAssetCandidates(normalizedUserId),
    getGeneratedImageCandidates(normalizedUserId),
    getAiImageCandidates(normalizedUserId),
  ])

  const keywords = extractKeywords(`${input.instruction || ""} ${input.styleHint || ""} ${input.offerHint || ""}`)

  const ranked = uniqueByUrl([...brandAssets, ...generatedImages, ...aiImages]).map((candidate, index) => ({
    ...candidate,
    score: computeCandidateScore(candidate, index, keywords),
  }))

  ranked.sort((a, b) => b.score - a.score)

  const heroImageUrl = ranked[0]?.url || ""
  const supportImageUrls = ranked
    .slice(1)
    .map((candidate) => candidate.url)
    .filter(Boolean)
    .slice(0, MAX_SUPPORT_IMAGES)

  return {
    heroImageUrl,
    supportImageUrls,
    rankedCandidates: ranked.slice(0, MAX_IMAGE_CANDIDATES),
  }
}
