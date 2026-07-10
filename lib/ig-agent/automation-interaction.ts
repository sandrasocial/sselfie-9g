type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function hasAutomationCallback(payload: unknown): boolean {
  if (!isRecord(payload)) return false
  if (isRecord(payload.postback)) return true

  const message = isRecord(payload.message) ? payload.message : null
  if (message && isRecord(message.quick_reply)) return true

  return false
}

const AUTOMATION_ACKNOWLEDGEMENTS = new Set([
  "grab it here",
  "yes show me",
  "i followed you",
])

const BUSINESS_AUTO_REPLY_RE =
  /^(?:hi[,!]?\s*)?(?:thanks|thank you) for (?:contacting|messaging|reaching out to) us\b|^we(?:'ve| have) received your message\b/i

function normalizedText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function automationInteractionReason(message: string, rawPayload?: unknown): string | null {
  if (hasAutomationCallback(rawPayload)) return "automation_callback"

  const normalized = normalizedText(message)
  if (AUTOMATION_ACKNOWLEDGEMENTS.has(normalized)) return "automation_acknowledgement"
  if (BUSINESS_AUTO_REPLY_RE.test(message.trim())) return "business_auto_reply"

  return null
}
