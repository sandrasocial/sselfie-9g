const TEST_EMAIL_DOMAINS = new Set([
  "playwright.test",
  "test.local",
  "sselfie.test",
  "sselfie-studio.internal",
  "example.com",
  "yopmail.com",
])

const TEST_LOCAL_PART_PATTERNS = [/^test[-_]/i, /^playwright/i, /^e2e/i, /^debug/i, /^smoke\+/i, /^qa[-_]/i]

export function isSyntheticAnalyticsEmail(email) {
  const normalized = String(email || "").trim().toLowerCase()
  const atIndex = normalized.indexOf("@")
  if (atIndex === -1) return false

  const local = normalized.slice(0, atIndex)
  const domain = normalized.slice(atIndex + 1)

  if (TEST_EMAIL_DOMAINS.has(domain)) return true
  if (domain.endsWith(".test") || domain.endsWith(".local")) return true
  if (TEST_LOCAL_PART_PATTERNS.some((pattern) => pattern.test(local))) return true

  return false
}
