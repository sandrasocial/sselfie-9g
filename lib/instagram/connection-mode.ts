export type InstagramConnectionMode = "instagram_login" | "facebook_page"

type InstagramConnectionModeInput = {
  access_token?: string | null
  page_access_token?: string | null
  account_type?: string | null
}

export function isInstagramLoginToken(token?: string | null) {
  return Boolean(token?.trim().startsWith("IGAA"))
}

export function resolveInstagramConnectionMode(input: InstagramConnectionModeInput): InstagramConnectionMode {
  const accountType = input.account_type?.trim().toLowerCase() || ""

  if (accountType === "instagram_login" || accountType === "instagram_business_login") {
    return "instagram_login"
  }

  if (isInstagramLoginToken(input.access_token)) {
    return "instagram_login"
  }

  return "facebook_page"
}

