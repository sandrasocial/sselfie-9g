const PLACEHOLDER_USERNAMES = new Set([
  "yourbrand",
  "your_brand",
  "mybrand",
  "yourinstagram",
])

const cleanText = (value: unknown) => (typeof value === "string" ? value.trim() : "")

export interface CalendarProfile {
  displayName: string
  profileImageUrl: string | null
  username: string
}

export function resolveCalendarProfile(feedData: any): CalendarProfile {
  const displayName =
    cleanText(feedData?.userDisplayName) || cleanText(feedData?.feed?.brand_name) || "Your brand"
  const storedUsername = cleanText(feedData?.feed?.username).replace(/^@/, "").toLowerCase()
  const fallbackUsername =
    displayName.toLowerCase().replace(/[^a-z0-9._]/g, "") || "yourbrand"
  const profileImageUrl =
    cleanText(feedData?.feed?.profile_image_url) || cleanText(feedData?.sharedProfileImageUrl) || null

  return {
    displayName,
    profileImageUrl,
    username:
      storedUsername && !PLACEHOLDER_USERNAMES.has(storedUsername)
        ? storedUsername
        : fallbackUsername,
  }
}
