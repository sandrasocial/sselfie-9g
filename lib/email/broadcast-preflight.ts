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

export interface BroadcastMergeTagIssue {
  tag: string
  index: number
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

function isSupportedResendBroadcastTag(tag: string): boolean {
  const trimmed = tag.trim()

  if (trimmed === "{{{RESEND_UNSUBSCRIBE_URL}}}") return true

  return /^{{{contact\.(first_name|last_name|email)(\|[^{}]+)?}}}$/.test(trimmed)
}

export function findUnsupportedBroadcastMergeTags(content: string): BroadcastMergeTagIssue[] {
  const issues: BroadcastMergeTagIssue[] = []
  const tagPattern = /{{{?[^{}]+}?}}/g
  let match: RegExpExecArray | null

  while ((match = tagPattern.exec(content)) !== null) {
    const tag = match[0]
    if (!isSupportedResendBroadcastTag(tag)) {
      issues.push({
        tag,
        index: match.index,
      })
    }
  }

  return issues
}

export function assertNoUnsupportedBroadcastMergeTags(content: string): void {
  const issues = findUnsupportedBroadcastMergeTags(content)
  if (issues.length === 0) return

  const badTags = Array.from(new Set(issues.map((issue) => issue.tag))).join(", ")
  throw new Error(
    `Broadcast contains unsupported Resend merge tag(s): ${badTags}. ` +
      "Use documented broadcast tags like {{{contact.first_name|there}}} or remove personalization.",
  )
}
