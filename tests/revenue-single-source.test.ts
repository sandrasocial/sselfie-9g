import { describe, expect, it } from "vitest"

import { calculateSubscriptionAmount } from "@/lib/revenue/subscription-amount"

describe("calculateSubscriptionAmount", () => {
  it("uses monthly unit amount for regular subscriptions", () => {
    const amount = calculateSubscriptionAmount({
      items: {
        data: [
          {
            price: {
              unit_amount: 9700,
              recurring: { interval: "month" },
            },
          },
        ],
      },
    })

    expect(amount).toBe(97)
  })

  it("applies percentage discounts to monthly amount", () => {
    const amount = calculateSubscriptionAmount({
      items: {
        data: [
          {
            price: {
              unit_amount: 9900,
              recurring: { interval: "month" },
            },
          },
        ],
      },
      discount: {
        coupon: {
          percent_off: 50,
        },
      },
    })

    expect(amount).toBe(49.5)
  })
})
