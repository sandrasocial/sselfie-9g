import { sql } from "@/lib/db/client"

export interface MayaInstagramTrendSignals {
  generatedAt: string
  sourceUrls: string[]
  hookPatterns: string[]
  ctaPatterns: string[]
  hashtagSets: string[]
  formatNotes: string[]
}

const DEFAULT_SOURCE_URLS = [
  "https://creators.instagram.com/",
  "https://later.com/blog/instagram-marketing/",
  "https://blog.hootsuite.com/instagram-marketing/",
]

const DEFAULT_SIGNALS: MayaInstagramTrendSignals = {
  generatedAt: new Date(0).toISOString(),
  sourceUrls: DEFAULT_SOURCE_URLS,
  hookPatterns: [
    "I almost quit before this changed everything",
    "3 things I stopped doing and my reach doubled",
    "If your content feels flat, try this sequence",
    "The behind-the-scenes no one sees",
    "Save this if you want more qualified DMs",
    "From chaos to clear plan in 7 days",
  ],
  ctaPatterns: [
    "Comment PLAN and I’ll send the template",
    "Save this so you can use it this week",
    "DM START and I’ll map your next step",
    "Send this to someone who needs this today",
    "Reply with CALENDAR if you want the full system",
  ],
  hashtagSets: [
    "#personalbrand #contentstrategy #instagramtips #storytelling #creatorbusiness",
    "#socialmediatips #contentplanner #brandgrowth #marketingforcreators #onlinebusiness",
    "#womeninbusiness #coachmarketing #reelstrategy #carouselpost #instagramgrowth",
  ],
  formatNotes: [
    "Lead with a clear hook in the first line and on-screen text.",
    "Blend reels, carousels, and static posts to spread reach and saves.",
    "Use one primary CTA per post to reduce friction.",
    "Keep captions human and story-led with a proof moment.",
    "Aim for 5-10 relevant hashtags across broad + niche intent.",
  ],
}

const TREND_EXTRACTION_REGEX =
  /(hook|reel|carousel|save|share|comment|dm|cta|caption|retention|storytelling|trend|creator|instagram)/i

function sanitizeTrendLine(value: string, maxLength = 140): string {
  if (!value) return ""
  const normalized = value
    .replace(/<[^>]+>/g, " ")
    .replace(/[#*_`|[\]]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (!normalized) return ""
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength).trimEnd()}...`
}

function uniqueStrings(values: string[], limit: number): string[] {
  const deduped: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    const cleaned = sanitizeTrendLine(value)
    if (!cleaned) continue
    const key = cleaned.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(cleaned)
    if (deduped.length >= limit) break
  }
  return deduped
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|li|h1|h2|h3|h4|h5|h6|div|section)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
}

function extractTrendCandidatesFromText(text: string): string[] {
  if (!text) return []
  const chunks = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((entry) => sanitizeTrendLine(entry))
    .filter(Boolean)

  return chunks.filter((entry) => TREND_EXTRACTION_REGEX.test(entry))
}

async function fetchSourceHtml(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8_000)
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "SSELFIE-Maya-Trend-Bot/1.0 (+https://sselfie.ai)",
      },
      signal: controller.signal,
      cache: "no-store",
    })
    if (!response.ok) {
      throw new Error(`Source returned ${response.status}`)
    }
    return await response.text()
  } finally {
    clearTimeout(timeout)
  }
}

function parseSourceListFromEnv(): string[] {
  const raw = String(process.env.MAYA_INSTAGRAM_TREND_SOURCES || "").trim()
  if (!raw) return DEFAULT_SOURCE_URLS
  const parsed = raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => /^https?:\/\//i.test(value))
  return parsed.length > 0 ? parsed : DEFAULT_SOURCE_URLS
}

export async function collectMayaInstagramTrendSignals(): Promise<MayaInstagramTrendSignals> {
  const sources = parseSourceListFromEnv()
  const extractedLines: string[] = []
  const usedSources: string[] = []

  for (const sourceUrl of sources) {
    try {
      const html = await fetchSourceHtml(sourceUrl)
      const text = htmlToText(html)
      const candidates = extractTrendCandidatesFromText(text)
      if (candidates.length > 0) {
        extractedLines.push(...candidates.slice(0, 20))
        usedSources.push(sourceUrl)
      }
    } catch (error) {
      console.warn("[Maya Trends] Failed source fetch:", sourceUrl, error)
    }
  }

  const hookPatterns = uniqueStrings(
    extractedLines.filter((line) => /(hook|first line|opening|scroll)/i.test(line)),
    12,
  )
  const ctaPatterns = uniqueStrings(
    extractedLines.filter((line) => /(cta|comment|save|dm|share|reply)/i.test(line)),
    10,
  )
  const formatNotes = uniqueStrings(
    extractedLines.filter((line) => /(reel|carousel|caption|retention|story|format|algorithm)/i.test(line)),
    12,
  )

  return {
    generatedAt: new Date().toISOString(),
    sourceUrls: usedSources.length > 0 ? usedSources : DEFAULT_SIGNALS.sourceUrls,
    hookPatterns: hookPatterns.length > 0 ? hookPatterns : DEFAULT_SIGNALS.hookPatterns,
    ctaPatterns: ctaPatterns.length > 0 ? ctaPatterns : DEFAULT_SIGNALS.ctaPatterns,
    hashtagSets: DEFAULT_SIGNALS.hashtagSets,
    formatNotes: formatNotes.length > 0 ? formatNotes : DEFAULT_SIGNALS.formatNotes,
  }
}

function toTrendSignalsPayload(payload: unknown): MayaInstagramTrendSignals | null {
  if (!payload || typeof payload !== "object") return null
  const record = payload as Record<string, unknown>

  const hookPatterns = uniqueStrings(Array.isArray(record.hookPatterns) ? (record.hookPatterns as string[]) : [], 20)
  const ctaPatterns = uniqueStrings(Array.isArray(record.ctaPatterns) ? (record.ctaPatterns as string[]) : [], 20)
  const hashtagSets = uniqueStrings(Array.isArray(record.hashtagSets) ? (record.hashtagSets as string[]) : [], 20)
  const formatNotes = uniqueStrings(Array.isArray(record.formatNotes) ? (record.formatNotes as string[]) : [], 20)
  const sourceUrls = uniqueStrings(Array.isArray(record.sourceUrls) ? (record.sourceUrls as string[]) : [], 12)

  return {
    generatedAt:
      typeof record.generatedAt === "string" && record.generatedAt.trim().length > 0
        ? record.generatedAt
        : new Date(0).toISOString(),
    sourceUrls: sourceUrls.length > 0 ? sourceUrls : DEFAULT_SIGNALS.sourceUrls,
    hookPatterns: hookPatterns.length > 0 ? hookPatterns : DEFAULT_SIGNALS.hookPatterns,
    ctaPatterns: ctaPatterns.length > 0 ? ctaPatterns : DEFAULT_SIGNALS.ctaPatterns,
    hashtagSets: hashtagSets.length > 0 ? hashtagSets : DEFAULT_SIGNALS.hashtagSets,
    formatNotes: formatNotes.length > 0 ? formatNotes : DEFAULT_SIGNALS.formatNotes,
  }
}

export async function getLatestMayaInstagramTrendSignals(): Promise<MayaInstagramTrendSignals> {
  try {
    const rows = await sql`
      SELECT payload
      FROM analytics_reports
      WHERE report_type = 'maya_instagram_trends_weekly'
      ORDER BY period_start DESC
      LIMIT 1
    `
    const payload = (rows[0] as { payload?: unknown } | undefined)?.payload
    const parsed = toTrendSignalsPayload(payload)
    if (parsed) return parsed
  } catch (error) {
    const code = String((error as { code?: string })?.code || "")
    if (code === "42P01") {
      return DEFAULT_SIGNALS
    }
    console.warn("[Maya Trends] Failed loading latest trends report:", error)
  }

  return DEFAULT_SIGNALS
}

export function getDefaultMayaInstagramTrendSignals(): MayaInstagramTrendSignals {
  return DEFAULT_SIGNALS
}
