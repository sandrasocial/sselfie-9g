/**
 * Neutral storage contract for the Cowork-authored weekly content brief.
 *
 * This module deliberately has no database, email, or retired content-engine dependencies so the
 * CLI writer and every live reader agree on one payload shape. Historical analytics rows can still
 * be read defensively, while new drafts are rejected before they can be stored or emailed.
 */

export const WEEKLY_BRIEF_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const

export type WeeklyBriefDay = (typeof WEEKLY_BRIEF_DAYS)[number]

export type WeeklyDemandMap = {
  strongestDemandSignal: string
  painfulBefore: string
  desiredAfter: string
  beliefShift: string
  primaryOfferBridge: string
  contentWarning: string
  audienceQuestions?: Array<{
    question: string
    suggestedAnswerContent: string
  }>
}

export type WeeklyTrendRadarEntry = {
  trend: string
  whyItsMoving: string
  howSandraRidesIt: string
  noFakeGuardrail: string
  /**
   * A generic visual directive that is safe to paste into a buyer-facing image prompt. Content-only
   * trends may use an empty string, but every stored brief must include at least one usable preset.
   */
  vibePreset: string
}

export type WeeklyContentPiece = {
  day: string
  format: "reel" | "carousel" | "feed"
  funnelStage: "cold" | "warm" | "activation"
  engineeredFor: "save" | "share" | "comment" | "follow"
  title: string
  hook: string
  visualHook: string
  onScreenText: string[]
  caption: string
  ctaKeyword: "PROMPT" | "SELFIE" | "KIT" | "WORK" | "none"
  whyThisWorks: string
  demandSignal?: string
  painfulBefore?: string
  desiredAfter?: string
  beliefShift?: string
  offerBridge?: string
  carouselOutline?: string[]
  [key: string]: unknown
}

export type WeeklyDailyTheme = {
  day: WeeklyBriefDay
  theme: string
  conversationType: "my-story" | "my-clients" | "my-beliefs" | "my-life"
  offerMention: string
  [key: string]: unknown
}

/** The payload stored in analytics_reports and read by current admin content consumers. */
export type WeeklyContentBrief = {
  periodStart?: string
  periodEnd?: string
  contentPlan: WeeklyContentPiece[]
  dailyStories?: WeeklyDailyTheme[]
  demandMap?: WeeklyDemandMap | null
  trendRadar?: WeeklyTrendRadarEntry[]
  researchNotes?: string
  [key: string]: unknown
}

/** The stricter input accepted by scripts/weekly-brief-prep.ts before any side effect. */
export type WeeklyBriefDraftInput = {
  researchNotes: string
  demandMap: WeeklyDemandMap
  trendRadar: WeeklyTrendRadarEntry[]
  contentPlan: WeeklyContentPiece[]
  dailyStories: WeeklyDailyTheme[]
  emailSummary: string
}

const CONTENT_FORMATS = ["reel", "carousel", "feed"] as const
const FUNNEL_STAGES = ["cold", "warm", "activation"] as const
const ENGAGEMENT_GOALS = ["save", "share", "comment", "follow"] as const
const CTA_KEYWORDS = ["PROMPT", "SELFIE", "KIT", "WORK", "none"] as const
const CONVERSATION_TYPES = ["my-story", "my-clients", "my-beliefs", "my-life"] as const

// The preset is a visual-world instruction, never marketing strategy. Keep this list narrow and
// explicit so photographic language such as "studio light" or "selfie" remains valid.
const UNSAFE_VIBE_LANGUAGE =
  /\b(?:sandra(?:'s)?|sselfie|maya|suite|vault|starter\s+kit|ai\s+photos?\s+kit|visibility\s+to\s+paid|work\s+with\s+me|manychat|instagram|tiktok|youtube|reels?|carousels?|stories?|feed|posts?|newsletters?|e-?mails?|cta|call\s+to\s+action|comments?|dms?)\b/i
const CTA_KEYWORD_LANGUAGE = /\b(?:PROMPT|SELFIE|KIT|WORK)\b/

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${path} must be an object`)
  return value
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${path} must be a non-empty string`)
  }
  return value
}

function requireAllowedString<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  path: string
): T[number] {
  const text = requireString(value, path)
  if (!allowed.includes(text)) {
    throw new Error(`${path} must be one of: ${allowed.join(", ")}`)
  }
  return text as T[number]
}

export function isBuyerSafeVibePreset(value: unknown): value is string {
  return (
    typeof value === "string" &&
    Boolean(value.trim()) &&
    !UNSAFE_VIBE_LANGUAGE.test(value) &&
    !CTA_KEYWORD_LANGUAGE.test(value)
  )
}

export function isUsableWeeklyTrend(value: unknown): value is WeeklyTrendRadarEntry {
  if (!isRecord(value) || !isBuyerSafeVibePreset(value.vibePreset)) return false
  return ["trend", "whyItsMoving", "howSandraRidesIt", "noFakeGuardrail"].every(
    key => typeof value[key] === "string" && Boolean(value[key].trim())
  )
}

function validateDemandMap(value: unknown): asserts value is WeeklyDemandMap {
  const demandMap = requireRecord(value, "demandMap")
  if ("offerBridge" in demandMap) {
    throw new Error(
      "demandMap.offerBridge is a retired alias; use demandMap.primaryOfferBridge only"
    )
  }
  for (const key of [
    "strongestDemandSignal",
    "painfulBefore",
    "desiredAfter",
    "beliefShift",
    "primaryOfferBridge",
    "contentWarning",
  ] as const) {
    requireString(demandMap[key], `demandMap.${key}`)
  }
}

function validateTrendRadar(value: unknown): asserts value is WeeklyTrendRadarEntry[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("trendRadar must contain at least one trend")
  }

  value.forEach((candidate, index) => {
    const trend = requireRecord(candidate, `trendRadar[${index}]`)
    for (const retiredKey of ["wave", "howToRideStillYou"] as const) {
      if (retiredKey in trend) {
        throw new Error(
          `trendRadar[${index}].${retiredKey} is a retired alias; use the canonical trend radar keys`
        )
      }
    }
    for (const key of ["trend", "whyItsMoving", "howSandraRidesIt", "noFakeGuardrail"] as const) {
      requireString(trend[key], `trendRadar[${index}].${key}`)
    }
    if (typeof trend.vibePreset !== "string") {
      throw new Error(`trendRadar[${index}].vibePreset must be a string`)
    }
    if (
      trend.vibePreset.trim() &&
      (UNSAFE_VIBE_LANGUAGE.test(trend.vibePreset) || CTA_KEYWORD_LANGUAGE.test(trend.vibePreset))
    ) {
      throw new Error(
        `trendRadar[${index}].vibePreset contains a name, product, keyword, or channel reference`
      )
    }
  })

  if (!value.some(isUsableWeeklyTrend)) {
    throw new Error("trendRadar must contain at least one usable buyer-safe vibePreset")
  }
}

function validateContentPlan(value: unknown): asserts value is WeeklyContentPiece[] {
  if (!Array.isArray(value) || value.length < 5) {
    throw new Error(
      `contentPlan must contain at least 5 pieces; got ${Array.isArray(value) ? value.length : 0}`
    )
  }

  value.forEach((candidate, index) => {
    const piece = requireRecord(candidate, `contentPlan[${index}]`)
    requireString(piece.day, `contentPlan[${index}].day`)
    requireAllowedString(piece.format, CONTENT_FORMATS, `contentPlan[${index}].format`)
    requireAllowedString(piece.funnelStage, FUNNEL_STAGES, `contentPlan[${index}].funnelStage`)
    requireAllowedString(
      piece.engineeredFor,
      ENGAGEMENT_GOALS,
      `contentPlan[${index}].engineeredFor`
    )
    for (const key of ["title", "hook", "visualHook", "caption", "whyThisWorks"] as const) {
      requireString(piece[key], `contentPlan[${index}].${key}`)
    }
    requireAllowedString(piece.ctaKeyword, CTA_KEYWORDS, `contentPlan[${index}].ctaKeyword`)
    if (!Array.isArray(piece.onScreenText) || piece.onScreenText.length === 0) {
      throw new Error(`contentPlan[${index}].onScreenText must contain at least one line`)
    }
    piece.onScreenText.forEach((line, lineIndex) =>
      requireString(line, `contentPlan[${index}].onScreenText[${lineIndex}]`)
    )
  })
}

function validateDailyThemes(value: unknown): asserts value is WeeklyDailyTheme[] {
  if (!Array.isArray(value) || value.length !== WEEKLY_BRIEF_DAYS.length) {
    throw new Error(
      `dailyStories must contain exactly 7 weekday themes; got ${Array.isArray(value) ? value.length : 0}`
    )
  }

  const seenDays = new Set<string>()
  value.forEach((candidate, index) => {
    const theme = requireRecord(candidate, `dailyStories[${index}]`)
    const day = requireAllowedString(theme.day, WEEKLY_BRIEF_DAYS, `dailyStories[${index}].day`)
    if (seenDays.has(day)) throw new Error(`dailyStories contains duplicate day: ${day}`)
    seenDays.add(day)
    requireString(theme.theme, `dailyStories[${index}].theme`)
    requireAllowedString(
      theme.conversationType,
      CONVERSATION_TYPES,
      `dailyStories[${index}].conversationType`
    )
    requireString(theme.offerMention, `dailyStories[${index}].offerMention`)
  })

  const missing = WEEKLY_BRIEF_DAYS.filter(day => !seenDays.has(day))
  if (missing.length)
    throw new Error(`dailyStories is missing weekday themes: ${missing.join(", ")}`)
}

export function validateWeeklyBriefDraft(value: unknown): WeeklyBriefDraftInput {
  const input = requireRecord(value, "weekly brief draft")
  requireString(input.researchNotes, "researchNotes")
  requireString(input.emailSummary, "emailSummary")
  validateDemandMap(input.demandMap)
  validateTrendRadar(input.trendRadar)
  validateContentPlan(input.contentPlan)
  validateDailyThemes(input.dailyStories)
  return input as WeeklyBriefDraftInput
}
