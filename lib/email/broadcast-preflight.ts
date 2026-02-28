export interface BroadcastPreflightInput {
  audienceEmails: Array<string | null | undefined>
  suppressedEmails: Array<string | null | undefined>
}

export interface BroadcastPreflightResult {
  totalAudience: number
  suppressedCount: number
  sendableCount: number
  sendableEmails: string[]
  suppressedAudienceEmails: string[]
}

export function normalizeEmailAddress(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null
  const normalized = value.trim().toLowerCase()
  if (!normalized || !normalized.includes("@")) return null
  return normalized
}

function uniqueNormalizedEmails(values: Array<string | null | undefined>): string[] {
  const out = new Set<string>()
  for (const value of values) {
    const normalized = normalizeEmailAddress(value)
    if (normalized) out.add(normalized)
  }
  return Array.from(out)
}

export function computeBroadcastPreflight(input: BroadcastPreflightInput): BroadcastPreflightResult {
  const audience = uniqueNormalizedEmails(input.audienceEmails)
  const suppressed = new Set(uniqueNormalizedEmails(input.suppressedEmails))

  const suppressedAudienceEmails = audience.filter((email) => suppressed.has(email))
  const sendableEmails = audience.filter((email) => !suppressed.has(email))

  return {
    totalAudience: audience.length,
    suppressedCount: suppressedAudienceEmails.length,
    sendableCount: sendableEmails.length,
    sendableEmails,
    suppressedAudienceEmails,
  }
}
