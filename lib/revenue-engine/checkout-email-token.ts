import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto"

const TOKEN_VERSION = "v1"
const IV_BYTES = 12
const TOKEN_MAX_AGE_MS = 45 * 24 * 60 * 60 * 1000
const CLOCK_SKEW_MS = 5 * 60 * 1000

type CheckoutEmailPayload = {
  e: string
  i: number
}

function isValidEmail(value: string): boolean {
  return (
    value.length <= 254 &&
    /^[^\s@/?#]+@[^\s@/?#]+\.[^\s@/?#]+$/.test(value)
  )
}

function normalizeEmail(value?: string | null): string | null {
  const email = value?.trim().toLowerCase()
  return email && isValidEmail(email) ? email : null
}

function checkoutEmailTokenSecret(): string {
  const secret =
    process.env.CHECKOUT_EMAIL_TOKEN_SECRET ||
    process.env.UNSUBSCRIBE_SECRET ||
    process.env.RESEND_WEBHOOK_SECRET ||
    process.env.CRON_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.RESEND_API_KEY

  if (secret) return secret

  if (process.env.NODE_ENV !== "production") {
    return "dev-checkout-email-token-secret"
  }

  throw new Error(
    "CHECKOUT_EMAIL_TOKEN_SECRET or another stable application secret is required for checkout email tokens"
  )
}

function encryptionKey(): Buffer {
  return createHash("sha256").update(checkoutEmailTokenSecret()).digest()
}

/**
 * Encrypt an email address for short-lived handoff from a marketing email to checkout.
 * The token is URL-safe and does not reveal the recipient address in browser history,
 * analytics, referrers, or provider click logs.
 */
export function createCheckoutEmailToken(
  email: string,
  issuedAtMs = Date.now()
): string | null {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return null

  const payload: CheckoutEmailPayload = {
    e: normalizedEmail,
    i: issuedAtMs,
  }
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv)
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return [
    TOKEN_VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".")
}

/**
 * Resolve an encrypted checkout handoff token. Invalid, tampered, future-dated, and
 * expired tokens fail closed and simply cause checkout to ask for an email again.
 */
export function readCheckoutEmailToken(
  token?: string | null,
  nowMs = Date.now()
): string | null {
  const clean = token?.trim()
  if (!clean) return null

  const [version, ivPart, authTagPart, encryptedPart, ...extra] = clean.split(".")
  if (
    version !== TOKEN_VERSION ||
    !ivPart ||
    !authTagPart ||
    !encryptedPart ||
    extra.length > 0
  ) {
    return null
  }

  try {
    const iv = Buffer.from(ivPart, "base64url")
    const authTag = Buffer.from(authTagPart, "base64url")
    const encrypted = Buffer.from(encryptedPart, "base64url")

    if (iv.length !== IV_BYTES || authTag.length !== 16 || encrypted.length === 0) {
      return null
    }

    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv)
    decipher.setAuthTag(authTag)
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString("utf8")

    const payload = JSON.parse(decrypted) as Partial<CheckoutEmailPayload>
    const email = typeof payload.e === "string" ? normalizeEmail(payload.e) : null
    const issuedAt = typeof payload.i === "number" ? payload.i : NaN

    if (!email || !Number.isFinite(issuedAt)) return null
    if (issuedAt > nowMs + CLOCK_SKEW_MS) return null
    if (nowMs - issuedAt > TOKEN_MAX_AGE_MS) return null

    return email
  } catch {
    return null
  }
}
