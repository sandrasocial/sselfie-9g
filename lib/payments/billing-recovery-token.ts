import { createHmac, timingSafeEqual } from "node:crypto"

type SignInput = {
  stripeSubscriptionId: string
  stripeInvoiceId: string
  expiresAt: Date
  secret?: string
}

type VerifyInput = {
  token: string
  secret?: string
  now?: Date
}

function recoverySecret(explicit?: string): string {
  const secret = explicit || process.env.BILLING_RECOVERY_SECRET || process.env.ADMIN_ACTION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      "BILLING_RECOVERY_SECRET or ADMIN_ACTION_SECRET must be configured with at least 32 characters"
    )
  }
  return secret
}

function signature(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url")
}

function validSubscriptionId(value: string): boolean {
  return /^sub_[A-Za-z0-9_]+$/.test(value)
}

function validInvoiceId(value: string): boolean {
  return /^in_[A-Za-z0-9_]+$/.test(value)
}

export function signBillingRecoveryToken({
  stripeSubscriptionId,
  stripeInvoiceId,
  expiresAt,
  secret,
}: SignInput): string {
  if (!validSubscriptionId(stripeSubscriptionId)) {
    throw new Error("Invalid Stripe subscription id")
  }
  if (!validInvoiceId(stripeInvoiceId)) {
    throw new Error("Invalid Stripe invoice id")
  }
  const expires = expiresAt.getTime()
  if (!Number.isSafeInteger(expires)) throw new Error("Invalid billing recovery expiry")
  const value = `${stripeSubscriptionId}.${stripeInvoiceId}.${expires}`
  return `${value}.${signature(value, recoverySecret(secret))}`
}

export function verifyBillingRecoveryToken({ token, secret, now = new Date() }: VerifyInput): {
  stripeSubscriptionId: string
  stripeInvoiceId: string
  expiresAt: Date
} {
  const [stripeSubscriptionId, stripeInvoiceId, rawExpiry, suppliedSignature, ...extra] =
    token.split(".")
  const expiryMs = Number(rawExpiry)
  if (
    extra.length > 0 ||
    !validSubscriptionId(stripeSubscriptionId) ||
    !validInvoiceId(stripeInvoiceId) ||
    !Number.isSafeInteger(expiryMs) ||
    !suppliedSignature
  ) {
    throw new Error("Invalid billing recovery token")
  }

  const value = `${stripeSubscriptionId}.${stripeInvoiceId}.${expiryMs}`
  const expected = Buffer.from(signature(value, recoverySecret(secret)))
  const supplied = Buffer.from(suppliedSignature)
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    throw new Error("Invalid billing recovery token")
  }

  const expiresAt = new Date(expiryMs)
  if (expiresAt.getTime() <= now.getTime()) {
    throw new Error("Billing recovery token expired")
  }
  return { stripeSubscriptionId, stripeInvoiceId, expiresAt }
}
