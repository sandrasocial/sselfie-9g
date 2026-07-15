import { describe, expect, it } from "vitest"
import {
  signBillingRecoveryToken,
  verifyBillingRecoveryToken,
} from "@/lib/payments/billing-recovery-token"

const SECRET = "test-secret-that-is-long-enough-for-hmac"

describe("billing recovery tokens", () => {
  it("signs one exact Stripe subscription with a short expiry", () => {
    const expiresAt = new Date("2026-07-17T12:00:00.000Z")
    const token = signBillingRecoveryToken({
      stripeSubscriptionId: "sub_recovery_123",
      stripeInvoiceId: "in_recovery_123",
      expiresAt,
      secret: SECRET,
    })

    expect(
      verifyBillingRecoveryToken({
        token,
        secret: SECRET,
        now: new Date("2026-07-14T12:00:00.000Z"),
      })
    ).toEqual({
      stripeSubscriptionId: "sub_recovery_123",
      stripeInvoiceId: "in_recovery_123",
      expiresAt,
    })
  })

  it("rejects a tampered subscription and an expired link", () => {
    const token = signBillingRecoveryToken({
      stripeSubscriptionId: "sub_recovery_123",
      stripeInvoiceId: "in_recovery_123",
      expiresAt: new Date("2026-07-17T12:00:00.000Z"),
      secret: SECRET,
    })

    expect(() =>
      verifyBillingRecoveryToken({
        token: token.replace("sub_recovery_123", "sub_recovery_999"),
        secret: SECRET,
        now: new Date("2026-07-14T12:00:00.000Z"),
      })
    ).toThrow("Invalid billing recovery token")

    expect(() =>
      verifyBillingRecoveryToken({
        token: token.replace("in_recovery_123", "in_recovery_999"),
        secret: SECRET,
        now: new Date("2026-07-14T12:00:00.000Z"),
      })
    ).toThrow("Invalid billing recovery token")

    expect(() =>
      verifyBillingRecoveryToken({
        token,
        secret: SECRET,
        now: new Date("2026-07-18T12:00:00.000Z"),
      })
    ).toThrow("Billing recovery token expired")
  })
})
