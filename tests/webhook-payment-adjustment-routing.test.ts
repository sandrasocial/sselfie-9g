// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("Stripe payment adjustment webhook routing", () => {
  it("routes every required refund and dispute event through the record-only handler", () => {
    const route = readFileSync(
      new URL("../app/api/webhooks/stripe/route.ts", import.meta.url),
      "utf8"
    )
    const required = [
      "refund.created",
      "refund.updated",
      "refund.failed",
      "charge.refunded",
      "charge.dispute.created",
      "charge.dispute.updated",
      "charge.dispute.closed",
      "charge.dispute.funds_withdrawn",
      "charge.dispute.funds_reinstated",
    ]
    for (const eventType of required) expect(route).toContain(`case "${eventType}"`)
    expect(route).toContain("await handlePaymentAdjustmentEvent(event)")
    expect(route).toContain("isPaymentAdjustmentEventType(event.type)")
    expect(route).toContain("stripeWebhookFailureEvidence(event)")
  })
})
