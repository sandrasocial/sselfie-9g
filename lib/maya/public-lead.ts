export interface MayaPublicLeadInput {
  pageId?: unknown
  email?: unknown
  name?: unknown
  source?: unknown
}

export interface MayaPublicLead {
  pageId: string
  email: string
  name: string | null
  source: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeString(value: unknown): string {
  if (typeof value !== "string") return ""
  return value.trim()
}

function clampText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return value.slice(0, maxLength)
}

export function normalizeMayaPublicLeadInput(input: MayaPublicLeadInput): MayaPublicLead | null {
  const pageId = clampText(normalizeString(input.pageId), 128)
  const email = clampText(normalizeString(input.email).toLowerCase(), 254)
  const rawName = clampText(normalizeString(input.name), 120)
  const source = clampText(normalizeString(input.source) || "personal_page", 64)

  if (!pageId || !email || !EMAIL_REGEX.test(email)) {
    return null
  }

  return {
    pageId,
    email,
    name: rawName || null,
    source,
  }
}
