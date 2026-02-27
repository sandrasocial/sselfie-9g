import { describe, expect, it } from "vitest"
import { isMembershipSubscription } from "@/lib/revenue/membership-subscription-filter"

function makeSubscription(overrides: Record<string, any> = {}) {
  return {
    livemode: true,
    metadata: {},
    items: {
      data: [
        {
          price: {
            id: "price_default",
            recurring: { interval: "month" },
          },
        },
      ],
    },
    ...overrides,
  }
}

describe("isMembershipSubscription", () => {
  it("matches configured membership price IDs", () => {
    const sub = makeSubscription({
      items: {
        data: [{ price: { id: "price_membership", recurring: { interval: "month" } } }],
      },
    })

    expect(isMembershipSubscription(sub, ["price_membership"])).toBe(true)
    expect(isMembershipSubscription(sub, ["price_other"])).toBe(false)
  })

  it("accepts membership product_type metadata even when price ID differs", () => {
    const sub = makeSubscription({
      metadata: { product_type: "sselfie_studio_membership" },
      items: {
        data: [{ price: { id: "price_non_matching", recurring: { interval: "month" } } }],
      },
    })

    expect(isMembershipSubscription(sub, ["price_other"])).toBe(true)
  })

  it("rejects non-livemode and non-recurring subscriptions", () => {
    expect(isMembershipSubscription(makeSubscription({ livemode: false }), ["price_membership"])).toBe(false)

    const nonRecurring = makeSubscription({
      items: {
        data: [{ price: { id: "price_membership", recurring: null } }],
      },
    })
    expect(isMembershipSubscription(nonRecurring, ["price_membership"])).toBe(false)
  })

  it("falls back to recurring subscriptions when no membership price IDs are configured", () => {
    const recurring = makeSubscription({
      items: {
        data: [{ price: { id: "price_unknown", recurring: { interval: "month" } } }],
      },
    })
    const oneTime = makeSubscription({
      items: {
        data: [{ price: { id: "price_one_time", recurring: null } }],
      },
    })

    expect(isMembershipSubscription(recurring, [])).toBe(true)
    expect(isMembershipSubscription(oneTime, [])).toBe(false)
  })
})
