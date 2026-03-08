export interface EmailRecipientNameInput {
  fullName?: string | null
  email?: string | null
  fallback?: string
}

export function getFirstNameForEmail({
  fullName,
  email,
  fallback = "friend",
}: EmailRecipientNameInput): string {
  const normalizedName = typeof fullName === "string" ? fullName.trim() : ""
  if (normalizedName.length > 0) {
    return normalizedName.split(/\s+/)[0]
  }

  const normalizedEmail = typeof email === "string" ? email.trim() : ""
  if (normalizedEmail.length > 0) {
    const localPart = normalizedEmail.split("@")[0]?.trim()
    if (localPart) {
      return localPart
    }
  }

  return fallback
}
