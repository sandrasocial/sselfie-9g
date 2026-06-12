import { createHmac, timingSafeEqual } from "node:crypto"

// Signed OAuth state for the Instagram connect flow. The callback writes an
// instagram_connections row for whatever userId the state carries, so the state
// must be unforgeable: HMAC over provider + userId + expiry, issued only by
// /api/instagram/connect after session auth. Unsigned/expired states are rejected.

export type InstagramOAuthProvider = "facebook_page" | "instagram_login"

const STATE_TTL_MS = 60 * 60 * 1000 // OAuth dance should finish well within an hour

function getStateSecret(): string {
  const secret = process.env.INSTAGRAM_STATE_SECRET || process.env.CRON_SECRET
  if (!secret) {
    throw new Error("INSTAGRAM_STATE_SECRET or CRON_SECRET must be set to sign Instagram OAuth state")
  }
  return secret
}

function sign(payload: string): string {
  return createHmac("sha256", getStateSecret()).update(payload).digest("hex")
}

export function createInstagramOAuthState(provider: InstagramOAuthProvider, userId: string): string {
  const expiresAt = Date.now() + STATE_TTL_MS
  const payload = `${provider}:${userId}:${expiresAt}`
  return `${payload}:${sign(payload)}`
}

export function verifyInstagramOAuthState(
  rawState: string | null | undefined,
): { provider: InstagramOAuthProvider; userId: string } | null {
  const state = rawState?.trim()
  if (!state) return null

  const parts = state.split(":")
  if (parts.length !== 4) return null

  const [provider, userId, expiresAtRaw, signature] = parts
  if (provider !== "facebook_page" && provider !== "instagram_login") return null
  if (!userId) return null

  const expiresAt = Number(expiresAtRaw)
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null

  const expected = sign(`${provider}:${userId}:${expiresAtRaw}`)
  const expectedBuf = Buffer.from(expected, "hex")
  const actualBuf = Buffer.from(signature || "", "hex")
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) return null

  return { provider, userId }
}
