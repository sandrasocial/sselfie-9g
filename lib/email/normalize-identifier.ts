const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F]/g
const WRAPPING_QUOTES_RE = /^['"`]+|['"`]+$/g

/**
 * Normalizes ids sourced from env/DB by stripping control characters,
 * surrounding quotes/backticks, and extra whitespace.
 */
export function normalizeEmailIdentifier(value?: string | null): string {
  const raw = String(value ?? "")
  if (!raw) return ""

  let normalized = raw.replace(CONTROL_CHARS_RE, "").trim()
  if (!normalized) return ""

  let previous = ""
  while (normalized !== previous) {
    previous = normalized
    normalized = normalized.replace(WRAPPING_QUOTES_RE, "").trim()
  }

  return normalized
}
