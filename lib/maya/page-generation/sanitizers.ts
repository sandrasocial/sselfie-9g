type MayaGeneratedAssetType = "page" | "calendar" | "pdf"

const MAX_HEADLINE_LENGTH = 96
const MAX_TITLE_LENGTH = 84
const MAX_PREVIEW_LENGTH = 220

const MARKDOWN_TOKEN_REGEX = /(^|\s)(#{1,6}|\*\*?|__?|`{1,3}|~~|>|\||\[[A-Z_]+(?::[^\]]+)?\])/gim
const HTML_TAG_REGEX = /<[^>]*>/g
const LIST_PREFIX_REGEX = /^\s*[-*+]\s+/gm
const ORDERED_LIST_PREFIX_REGEX = /^\s*\d+\.\s+/gm
const REPEATED_PUNCTUATION_REGEX = /([!?.,])\1{1,}/g
const TEXTISH_OBJECT_KEYS = ["text", "label", "title", "value", "name", "caption", "cta", "direction", "hook", "hashtags", "content"] as const

const BANNED_PHRASES = [
  "unlock",
  "game-changer",
  "level up",
  "transform your life overnight",
  "robust solution",
  "synergy",
  "dear valued customer",
]

function trimToLength(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength).trimEnd()}...`
}

function stripEmojis(value: string): string {
  return value.replace(/\p{Extended_Pictographic}/gu, "")
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function removeMarkdownAndArtifacts(value: string): string {
  return value
    .replace(MARKDOWN_TOKEN_REGEX, " ")
    .replace(/\*\*/g, " ")
    .replace(/__/g, " ")
    .replace(/`/g, " ")
    .replace(LIST_PREFIX_REGEX, "")
    .replace(ORDERED_LIST_PREFIX_REGEX, "")
    .replace(HTML_TAG_REGEX, " ")
    .replace(/\[\s*\]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
}

function stripOfferNoise(value: string): string {
  return value
    .replace(/(^|\s)(offer|transformation|ideal client|design direction|proof points?|cta|price point|format|audience)\s*:\s*/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
}

function collectTextFragments(value: unknown, depth = 0): string[] {
  if (depth > 3 || value === null || value === undefined) return []
  if (typeof value === "string") return [value]
  if (typeof value === "number" || typeof value === "boolean") return [String(value)]

  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectTextFragments(entry, depth + 1))
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>
    const preferred = TEXTISH_OBJECT_KEYS.flatMap((key) => collectTextFragments(record[key], depth + 1))
    if (preferred.length > 0) return preferred
    return Object.values(record).flatMap((entry) => collectTextFragments(entry, depth + 1))
  }

  return []
}

function normalizeSanitizerInput(value: unknown): string {
  return collectTextFragments(value)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join(" ")
}

export function sanitizeUserFacingText(value: unknown, maxLength = 240): string {
  const normalizedInput = normalizeSanitizerInput(value)
  if (!normalizedInput) return ""

  const cleaned = normalizeWhitespace(
    stripOfferNoise(removeMarkdownAndArtifacts(stripEmojis(normalizedInput))).replace(REPEATED_PUNCTUATION_REGEX, "$1"),
  )

  return trimToLength(cleaned, maxLength)
}

export function sanitizeHeadline(value: unknown): string {
  const cleaned = sanitizeUserFacingText(value, MAX_HEADLINE_LENGTH)
  if (!cleaned) return "Build your next offer with Maya"
  const sentence = cleaned.replace(/[.!?]+$/g, "")
  return sentence.charAt(0).toUpperCase() + sentence.slice(1)
}

export function sanitizePageTitle(assetType: MayaGeneratedAssetType, value: unknown): string {
  const cleaned = sanitizeUserFacingText(value, MAX_TITLE_LENGTH)
  if (!cleaned) {
    if (assetType === "calendar") return "Content Calendar"
    if (assetType === "pdf") return "Workbook"
    return "Landing Page"
  }
  return cleaned
}

export function sanitizePreview(value: unknown): string {
  const cleaned = sanitizeUserFacingText(value, MAX_PREVIEW_LENGTH)
  if (!cleaned) return "Draft generated."
  return cleaned
}

export function containsBannedPhrase(value: unknown): boolean {
  const normalized = normalizeSanitizerInput(value).toLowerCase()
  return BANNED_PHRASES.some((phrase) => normalized.includes(phrase))
}

export function clampProofBullets(values: string[], maxItems = 3): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    const cleaned = sanitizeUserFacingText(value, 140)
    if (!cleaned) continue
    const dedupeKey = cleaned.toLowerCase()
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    result.push(cleaned)
    if (result.length >= maxItems) break
  }

  return result
}

export function hasMarkdownArtifacts(value: unknown): boolean {
  return /[#*`\[\]{}_]/.test(normalizeSanitizerInput(value))
}

export function sanitizeCtaLabel(value: unknown): string {
  const cleaned = sanitizeUserFacingText(value, 44)
  if (!cleaned) return "Join Studio"

  const normalized = cleaned.toLowerCase()
  if (normalized === "learn more" || normalized === "submit") {
    return "Join Studio"
  }

  return cleaned
}

export function sanitizeCtaHref(value: string, fallbackHref: string): string {
  const trimmed = normalizeSanitizerInput(value).trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith("/")) return trimmed
  return fallbackHref
}
