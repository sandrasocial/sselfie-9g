export interface EmailRecipientNameInput {
  fullName?: string | null
  email?: string | null
  fallback?: string
}

export function getFirstNameForEmail({
  fullName,
  fallback = "there",
}: EmailRecipientNameInput): string {
  const normalizedName = typeof fullName === "string" ? fullName.trim() : ""
  if (normalizedName.length > 0) {
    return normalizedName.split(/\s+/)[0]
  }

  // Never infer a person's name from the local part of their email address.
  // Values such as "firstname.lastname", role inboxes, and arbitrary handles
  // create awkward or privacy-unfriendly greetings in lifecycle email.
  return fallback
}
