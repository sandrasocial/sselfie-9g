// @vitest-environment node
import { readFileSync } from "fs"
import path from "path"

import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function read(relativePath: string) {
  return readFileSync(path.join(ROOT, relativePath), "utf8")
}

describe("Stripe webhook studio membership checkout extraction", () => {
  it("delegates subscription checkout fulfillment to the studio membership handler", () => {
    const routeSource = read("app/api/webhooks/stripe/route.ts")
    const checkoutSessionSource = read("lib/payments/lifecycle/checkout-session-completed.ts")
    const handlerSource = read("lib/payments/handlers/studio-membership.ts")

    expect(routeSource).toContain("handleCheckoutSessionCompleted")
    expect(checkoutSessionSource).toContain("handleStudioMembershipSubscriptionCheckout")
    expect(checkoutSessionSource).toContain("await handleStudioMembershipSubscriptionCheckout({")
    expect(checkoutSessionSource).toContain("maybeTrackCheckoutReferralSignup,")
    expect(routeSource).not.toContain("New subscription purchase from")
    expect(routeSource).not.toContain("Membership welcome (existing user) sent")

    expect(handlerSource).toContain("Subscription purchase from")
    expect(handlerSource).toContain("sendExistingSubscriptionBuyerWelcomeBestEffort")
    expect(handlerSource).toContain("sendNewSubscriptionBuyerWelcome")
    expect(handlerSource).toContain("getSubscriptionPeriod(subscriptionData)")
  })
})
