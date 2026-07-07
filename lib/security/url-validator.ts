/**
 * URL Security Validator
 * Prevents open redirect vulnerabilities and malicious URL injections
 */

const ALLOWED_PROTOCOLS = ["http:", "https:"]
export const LIVE_MEMBER_APP_PATH = "/app"

const ALLOWED_REDIRECT_PATHS = [
  "/app",
  "/studio",
  "/auth",
  "/admin",
  "/checkout",
  "/academy",
  "/feed-planner",
  "/maya",
  "/profile",
  "/brand-strategy",
  "/strategy",
]

const LEGACY_STUDIO_TAB_TO_APP_VIEW: Record<string, string> = {
  maya: "create",
  studio: "create",
  gallery: "photos",
  "feed-planner": "calendar",
  academy: "library",
  account: "account",
}

/**
 * Validates that a redirect path is safe (relative path only)
 * Prevents open redirect attacks
 */
export function isValidRedirectPath(path: string): boolean {
  // Must start with /
  if (!path.startsWith("/")) {
    return false
  }

  // Must not be a protocol-relative URL (//evil.com)
  if (path.startsWith("//")) {
    return false
  }

  // Must not contain backslashes (Windows path traversal)
  if (path.includes("\\")) {
    return false
  }

  // Check if path starts with an allowed route
  const isAllowedPath = ALLOWED_REDIRECT_PATHS.some((allowed) => path.startsWith(allowed))

  return isAllowedPath
}

/**
 * Validates external URLs for safe protocols
 * Prevents javascript:, data:, and other dangerous URIs
 */
export function isValidExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url)

    // Only allow http and https protocols
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      return false
    }

    // Reject URLs with credentials
    if (parsed.username || parsed.password) {
      return false
    }

    return true
  } catch {
    // Invalid URL format
    return false
  }
}

/**
 * Sanitizes a redirect parameter - returns safe path or default
 */
export function sanitizeRedirect(redirect: string | null, defaultPath = LIVE_MEMBER_APP_PATH): string {
  if (!redirect) {
    return defaultPath
  }

  if (isValidRedirectPath(redirect)) {
    return redirect
  }

  // Invalid redirect - return default
  console.warn("[Security] Blocked invalid redirect attempt:", redirect)
  return defaultPath
}

/**
 * Converts ordinary legacy Studio shell redirects to the live member app.
 * Explicit legacy inspection links keep working through ?legacy=1.
 */
export function normalizeLegacyStudioRedirect(redirect: string): string {
  if (!redirect.startsWith("/studio")) {
    return redirect
  }

  try {
    const url = new URL(redirect, "https://sselfie.ai")
    if (url.searchParams.get("legacy") === "1") {
      return redirect
    }

    const tab = url.searchParams.get("tab")
    const appView = tab ? LEGACY_STUDIO_TAB_TO_APP_VIEW[tab] : null
    if (!appView || appView === "create") {
      return LIVE_MEMBER_APP_PATH
    }

    return `${LIVE_MEMBER_APP_PATH}?view=${encodeURIComponent(appView)}`
  } catch {
    return LIVE_MEMBER_APP_PATH
  }
}

/**
 * Sanitizes an external URL - returns URL or null if invalid
 */
export function sanitizeExternalUrl(url: string): string | null {
  if (!url) {
    return null
  }

  if (isValidExternalUrl(url)) {
    return url
  }

  console.warn("[Security] Blocked invalid external URL:", url)
  return null
}
