import { describe, expect, it } from "vitest"

import {
  getMembershipPromoBlockReason,
  isMembershipPromoAllowed,
} from "@/lib/stripe/membership-promo-policy"

describe("membership promo policy", () => {
  it("blocks forever 50% membership discounts", () => {
    const reason = getMembershipPromoBlockReason({
      duration: "forever",
      percentOff: 50,
    })
    expect(reason).toContain("no longer available")
    expect(
      isMembershipPromoAllowed({
        duration: "forever",
        percentOff: 50,
      }),
    ).toBe(false)
  })

  it("allows non-forever discounts", () => {
    expect(
      isMembershipPromoAllowed({
        duration: "once",
        percentOff: 50,
      }),
    ).toBe(true)
  })

  it("allows forever discounts below threshold", () => {
    expect(
      isMembershipPromoAllowed({
        duration: "forever",
        percentOff: 30,
      }),
    ).toBe(true)
  })
})
