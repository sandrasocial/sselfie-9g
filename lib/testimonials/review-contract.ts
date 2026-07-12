export const SUITE_REVIEW_PRODUCT = "SSELFIE SUITE"
export const SUITE_REVIEW_PLATFORM = "in_app"
export const SUITE_REVIEW_MIN_DOWNLOADS = 3
export const SUITE_REVIEW_MIN_TEXT_LENGTH = 10
export const SUITE_REVIEW_MAX_TEXT_LENGTH = 1000
export const SUITE_REVIEW_DISMISSAL_COOLDOWN_DAYS = 30
export const SUITE_REVIEW_PROMPT_COOLDOWN_DAYS = 7

export type SuiteReviewEligibilityRow = {
  download_count?: number | string | null
  prior_submission?: boolean | null
  recent_dismissal?: boolean | null
  recent_prompt?: boolean | null
}

export type SuiteReviewEligibilityReason =
  | "eligible"
  | "not_enough_downloads"
  | "already_submitted"
  | "recently_dismissed"
  | "recently_shown"

export function normalizeReviewText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

export function isValidReviewText(value: string): boolean {
  return (
    value.length >= SUITE_REVIEW_MIN_TEXT_LENGTH &&
    value.length <= SUITE_REVIEW_MAX_TEXT_LENGTH
  )
}

export function isValidReviewRating(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5
}

export function evaluateSuiteReviewEligibility(row: SuiteReviewEligibilityRow): {
  eligible: boolean
  reason: SuiteReviewEligibilityReason
  downloadCount: number
} {
  const downloadCount = Math.max(0, Number(row.download_count || 0))

  if (row.prior_submission) {
    return { eligible: false, reason: "already_submitted", downloadCount }
  }
  if (row.recent_dismissal) {
    return { eligible: false, reason: "recently_dismissed", downloadCount }
  }
  if (row.recent_prompt) {
    return { eligible: false, reason: "recently_shown", downloadCount }
  }
  if (downloadCount < SUITE_REVIEW_MIN_DOWNLOADS) {
    return { eligible: false, reason: "not_enough_downloads", downloadCount }
  }

  return { eligible: true, reason: "eligible", downloadCount }
}

export function safeReviewContextValue(value: unknown, maxLength = 80): string | null {
  if (typeof value !== "string") return null
  const normalized = value.trim()
  if (!normalized) return null
  return normalized.slice(0, maxLength)
}
