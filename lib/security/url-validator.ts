/**
 * URL Security Validator
 * Prevents open redirect vulnerabilities and malicious URL injections
 */

const ALLOWED_PROTOCOLS = ["http:", "https:"]
const ALLOWED_REDIRECT_PATHS = [
  "/studio",
  "/auth",
  "/admin",
  "/checkout",
  "/academy",
  "/feed-planner",
  "/maya",
  "/profile",
  "/blueprint",
]

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
export function sanitizeRedirect(redirect: string | null, defaultPath = "/studio"): string {
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
