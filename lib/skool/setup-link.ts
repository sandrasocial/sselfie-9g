import { createHmac, timingSafeEqual } from "node:crypto"

const BASE64URL_32_BYTES = /^[A-Za-z0-9_-]{43}$/
const MEMBERSHIP_KEY = /^skool:sselfie-photo-club-2569:[a-f0-9]{32}$/

function decodeSecret(value: string | null | undefined): Buffer | null {
  const normalized = value?.trim() || ""
  if (!BASE64URL_32_BYTES.test(normalized)) return null
  const secret = Buffer.from(normalized, "base64url")
  if (secret.length !== 32 || secret.toString("base64url") !== normalized) return null
  return secret
}

function productionOrigin(value: string | null | undefined): string {
  try {
    const parsed = new URL(value || "https://sselfie.ai")
    if (
      parsed.protocol === "https:" &&
      (parsed.hostname === "sselfie.ai" || parsed.hostname === "www.sselfie.ai")
    ) {
      return parsed.origin
    }
  } catch {
    // Fall through to canonical production origin.
  }
  return "https://sselfie.ai"
}

function setupDigest(secret: Buffer, membershipKey: string): string {
  return createHmac("sha256", secret)
    .update(`skool-setup\0${membershipKey}`, "utf8")
    .digest("base64url")
}

export function buildSkoolSetupEntryLink(input: {
  membershipKey: string
  secret: string | null | undefined
  productionUrl?: string | null
}): string {
  const secret = decodeSecret(input.secret)
  if (!secret || !MEMBERSHIP_KEY.test(input.membershipKey)) {
    throw new Error("SKOOL_SETUP_LINK_FAILED")
  }

  const url = new URL("/auth/skool-setup", productionOrigin(input.productionUrl))
  url.searchParams.set("membership", input.membershipKey)
  // Keep the bearer credential in the fragment. Browsers do not send URL
  // fragments in HTTP requests, reverse-proxy logs, or referrer headers.
  url.hash = `token=${setupDigest(secret, input.membershipKey)}`
  return url.toString()
}

export function verifySkoolSetupEntryToken(input: {
  membershipKey: string
  token: string | null | undefined
  secret: string | null | undefined
}): boolean {
  const secret = decodeSecret(input.secret)
  const supplied = input.token?.trim() || ""
  if (!secret || !MEMBERSHIP_KEY.test(input.membershipKey) || !/^[A-Za-z0-9_-]{43}$/.test(supplied)) {
    return false
  }

  const expected = setupDigest(secret, input.membershipKey)
  const expectedBuffer = Buffer.from(expected)
  const actualBuffer = Buffer.from(supplied)
  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  )
}
