export type InstagramConnectionMode = "instagram_login" | "facebook_page"

type InstagramConnectionModeInput = {
  access_token?: string | null
  page_access_token?: string | null
  account_type?: string | null
}

const FACEBOOK_GRAPH_BASE = "https://graph.facebook.com/v21.0"
const INSTAGRAM_GRAPH_BASE = "https://graph.instagram.com/v21.0"

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

export function resolveInstagramGraphBase(input: InstagramConnectionModeInput) {
  return resolveInstagramConnectionMode(input) === "instagram_login"
    ? INSTAGRAM_GRAPH_BASE
    : FACEBOOK_GRAPH_BASE
}
