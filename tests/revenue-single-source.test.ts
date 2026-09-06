import { describe, expect, it } from "vitest"

import { calculateSubscriptionAmount, subscriptionMrrByCurrency } from "@/lib/revenue/subscription-amount"

describe("calculateSubscriptionAmount", () => {
  it("sums discounts and annual revenue by currency before rounding", () => {
    const sub = (amount: number, currency: string, interval = "month", percent?: number) => ({
      items: { data: [{ price: { unit_amount: amount, currency, recurring: { interval } } }] },
      discount: percent ? { coupon: { percent_off: percent } } : null,
    })
    const subscriptions = [
      ...Array.from({ length: 5 }, () => sub(9900, "usd", "month", 50)),
      sub(9700, "usd", "month", 50), sub(9700, "usd"),
      ...Array.from({ length: 5 }, () => sub(9700, "eur")), sub(69700, "eur", "year"),
    ]
    expect(subscriptionMrrByCurrency(subscriptions)).toEqual({ USD: 393, EUR: 543.08 })
    expect(subscriptionMrrByCurrency([...subscriptions].reverse())).toEqual({ USD: 393, EUR: 543.08 })
    expect(subscriptionMrrByCurrency(subscriptions, true)).toEqual({ USD: 689, EUR: 543.08 })
    expect(subscriptionMrrByCurrency([])).toEqual({})
  })
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
