export interface EmailRecipientNameInput {
  fullName?: string | null
  email?: string | null
  fallback?: string
}

export function getFirstNameForEmail({
  fullName,
  email,
  fallback = "there",
}: EmailRecipientNameInput): string {
  const normalizedName = typeof fullName === "string" ? fullName.trim() : ""
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : ""
  const emailLocalPart = normalizedEmail.split("@")[0]?.trim() || ""

  if (
    normalizedName.length > 0 &&
    (!emailLocalPart || normalizedName.toLowerCase() !== emailLocalPart)
  ) {
    return normalizedName.split(/\s+/)[0]
  }

  // Never infer or reuse a person's name from the local part of their email address.
  // Older purchase records can contain values such as "firstname.lastname" as the stored
  // name; those should render as a neutral greeting instead.
  return fallback
}
