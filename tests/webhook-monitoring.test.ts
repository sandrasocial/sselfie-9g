import { describe, expect, it } from "vitest"

import { isCriticalError } from "@/lib/webhook-monitoring"

describe("webhook monitoring critical alert classification", () => {
  it("does not email-alert the expected fresh subscription invoice retry race", () => {
    expect(
      isCriticalError(
        "invoice.paid",
        "Subscription sub_123 not in database yet for fresh subscription_create invoice in_123 - failing so Stripe retries after checkout fulfillment"
      )
    ).toBe(false)
  })

  it("still treats unresolved invoice subscription failures as critical", () => {
    expect(isCriticalError("invoice.paid", "Subscription sub_123 missing from database")).toBe(
      true
    )
  })

  it("still treats checkout fulfillment failures as critical", () => {
    expect(isCriticalError("checkout.session.completed", "database write failed")).toBe(true)
  })
})
