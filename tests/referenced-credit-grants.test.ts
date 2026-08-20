// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("atomic referenced Stripe credit grants", () => {
  it("uses a mode- and purpose-scoped advisory transaction with one wallet/ledger statement", () => {
    const source = read("lib/credits.ts")
    const start = source.indexOf("export async function grantReferencedPurchaseCredits")
    const end = source.indexOf("export async function addCredits", start)
    const grant = source.slice(start, end)

    expect(start).toBeGreaterThan(-1)
    expect(grant).toContain("pg_advisory_xact_lock")
    expect(grant).toContain("input.userId")
    expect(grant).toContain("modeKey")
    expect(grant).toContain("transactionType")
    expect(grant).toContain("paymentReference")
    expect(grant).toContain("grantPurpose")
    expect(grant).toContain("existing_grant AS MATERIALIZED")
    expect(grant).toContain("balance_upsert AS")
    expect(grant).toContain("ledger_insert AS")
    expect(grant).toContain("EXISTS (SELECT 1 FROM ledger_insert) AS granted")
    expect(grant).toContain("reference_id = ${grantPurpose}")
    expect(grant).not.toContain("ON CONFLICT (stripe_payment_id)")
  })

  it("allows shared-wallet fulfillment for live Stripe money only", async () => {
    const { shouldFulfillStripePurchaseCredits } = await import("@/lib/credits")

    expect(shouldFulfillStripePurchaseCredits(true)).toBe(true)
    expect(shouldFulfillStripePurchaseCredits(false)).toBe(false)
  })

  it("migrates every scoped purchase-credit cohort and never ignores a false grant", () => {
    const handlers = [
      read("lib/payments/handlers/credit-topup.ts"),
      read("lib/payments/handlers/one-time-session.ts"),
      read("lib/payments/handlers/transform.ts"),
      read("lib/payments/handlers/paid-blueprint.ts"),
    ]

    for (const handler of handlers) {
      expect(handler).toContain("shouldFulfillStripePurchaseCredits")
      expect(handler).toMatch(/if \(!creditResult\.success\)/)
      expect(handler).not.toContain("await addCredits(")
    }

    expect(handlers[0]).toContain('grantPurpose: "credit_topup"')
    expect(handlers[1]).toContain("grantOneTimeSessionCredits")
    expect(handlers[2]).toContain("grantPurpose: productType")
    expect(handlers[3]).toContain("grantPaidBlueprintCredits")

    const lifecycle = read("lib/payments/lifecycle/checkout-session-completed.ts")
    expect(lifecycle).toContain("isDiagnosticOnlyPurchaseCreditCheckout")
    expect(lifecycle).toContain("!event.livemode")
    expect(lifecycle).not.toContain("suppressPurchaseCreditCustomerEffects")
    expect(lifecycle).toContain("sendPurchaseCreditFulfillmentEmail")
    expect(lifecycle).toContain("idempotencyKey:")
    expect(lifecycle).toContain("/auth/forgot-password?next=")
    expect(lifecycle).toContain("Paid blueprint user_id unresolved")
    expect(lifecycle.indexOf("isDiagnosticOnlyPurchaseCreditCheckout")).toBeLessThan(
      lifecycle.indexOf("await persistCheckoutAttributionContact")
    )
  })

  it("returns retryable failures instead of marking purchase-credit events processed", () => {
    const topup = read("lib/payments/handlers/credit-topup.ts")
    const oneTime = read("lib/payments/handlers/one-time-session.ts")
    const transform = read("lib/payments/handlers/transform.ts")
    const blueprint = read("lib/payments/handlers/paid-blueprint.ts")

    expect(topup).toMatch(/if \(!creditResult\.success\)[\s\S]*throw new Error/)
    expect(oneTime).toMatch(/if \(!creditResult\.success\)[\s\S]*throw new Error/)
    expect(transform).toMatch(/if \(!creditResult\.success\)[\s\S]*status: 500/)
    expect(blueprint).toMatch(/if \(!creditResult\.success\)[\s\S]*throw new Error/)
    expect(blueprint).toContain("AND status IN ('sent', 'delivered')")
    expect(blueprint).toContain("idempotencyKey: `paid-blueprint-delivery:${session.id}`")
    expect(blueprint).not.toContain("delivery email (non-critical)")
  })
})
