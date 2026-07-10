import { createHmac, timingSafeEqual } from "node:crypto"

type SignInput = {
  actionId: number
  expiresAt: Date
  secret?: string
}

type VerifyInput = {
  token: string
  secret?: string
  now?: Date
}

function actionSecret(explicit?: string): string {
  const secret = explicit || process.env.ADMIN_ACTION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error("ADMIN_ACTION_SECRET must be configured with at least 32 characters")
  }
  return secret
}

function signature(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url")
}

export function signAdminActionToken({ actionId, expiresAt, secret }: SignInput): string {
  if (!Number.isSafeInteger(actionId) || actionId <= 0) {
    throw new Error("Invalid admin action id")
  }
  const expires = expiresAt.getTime()
  if (!Number.isFinite(expires)) throw new Error("Invalid admin action expiry")
  const value = `${actionId}.${expires}`
  return `${value}.${signature(value, actionSecret(secret))}`
}

export function verifyAdminActionToken({ token, secret, now = new Date() }: VerifyInput): {
  actionId: number
  expiresAt: Date
} {
  const [rawId, rawExpiry, suppliedSignature, ...extra] = token.split(".")
  const actionId = Number(rawId)
  const expiryMs = Number(rawExpiry)
  if (
    extra.length > 0 ||
    !Number.isSafeInteger(actionId) ||
    actionId <= 0 ||
    !Number.isSafeInteger(expiryMs) ||
    !suppliedSignature
  ) {
    throw new Error("Invalid admin action token")
  }

  const value = `${actionId}.${expiryMs}`
  const expected = Buffer.from(signature(value, actionSecret(secret)))
  const supplied = Buffer.from(suppliedSignature)
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    throw new Error("Invalid admin action token")
  }

  const expiresAt = new Date(expiryMs)
  if (expiresAt.getTime() <= now.getTime()) {
    throw new Error("Admin action token expired")
  }
  return { actionId, expiresAt }
}

