import type { ShootShotRole } from "@/lib/content-kit/types"

type PublicVaultUseInput = {
  title?: string | null
  mood?: string | null
  whenToUse?: string | null
  shotRole?: ShootShotRole | string | null
}

const INTERNAL_COPY_PATTERNS = [
  /\bprompt my selfie\b/i,
  /\bcaption\s*:/i,
  /\bcaption energy\b/i,
  /\bbefore[-\s]?after\b/i,
  /\bworks for\b/i,
  /\blead magnet\b/i,
  /\bsandra\b/i,
  /\bseries\b/i,
  /\breels? showing\b/i,
  /\beditorial covers?\b/i,
  /\bnegative space\b/i,
  /\buse this for\s+(prompt|reel|summer|launch|content)/i,
]

function normalizeText(value?: string | null): string {
  return String(value || "").replace(/\s+/g, " ").trim()
}

export function isInternalVaultUseCopy(value?: string | null): boolean {
  const text = normalizeText(value)
  if (!text) return false
  return INTERNAL_COPY_PATTERNS.some((pattern) => pattern.test(text))
}

function roleFromInput({ title, mood, shotRole }: PublicVaultUseInput): ShootShotRole | "fallback" {
  if (shotRole) return String(shotRole) as ShootShotRole
  const haystack = `${title || ""} ${mood || ""}`.toLowerCase()
  if (/\b(detail|table|coffee|croissant|hands?|accessor|texture|still life)\b/.test(haystack)) {
    return "true-detail"
  }
  if (/\b(profile|gaze|side|close|beauty|portrait)\b/.test(haystack)) {
    return "profile"
  }
  if (/\b(seated|hero|main|still)\b/.test(haystack)) {
    return "seated-hero"
  }
  if (/\b(arrival|full[-\s]?body|establish|street|walk)\b/.test(haystack)) {
    return "establishing-full-body"
  }
  if (/\b(move|motion|lifestyle|action)\b/.test(haystack)) {
    return "movement-lifestyle-action"
  }
  if (/\b(cover|negative|safe)\b/.test(haystack)) {
    return "cover-safe-hero"
  }
  return "fallback"
}

export function derivePublicVaultWhenToUse(input: PublicVaultUseInput): string {
  const existing = normalizeText(input.whenToUse)
  if (existing && !isInternalVaultUseCopy(existing)) return existing

  switch (roleFromInput(input)) {
    case "establishing-full-body":
      return "Use this as the opening image for the shoot. It sets the place, outfit, and mood before you move into the closer shots."
    case "movement-lifestyle-action":
      return "Use this when the shoot needs movement. It makes the collection feel like a real moment, not a posed studio set."
    case "seated-hero":
      return "Use this as the main portrait for the shoot. It gives the collection a calm, polished image you can use on its own or inside a carousel."
    case "profile":
    case "close-portrait":
      return "Use this when you want a quieter portrait moment. It keeps the focus on expression, styling, and the mood of the collection."
    case "cover-safe-hero":
      return "Use this as the cover image or first slide. The composition leaves room for text while keeping the shoot world clear."
    case "true-detail":
      return "Use this as the detail image that makes the shoot feel real. It gives the collection texture, styling, and a quiet pause between portraits."
    default:
      return "Use this as part of the full shoot. It gives you one more finished image in the same visual world."
  }
}
