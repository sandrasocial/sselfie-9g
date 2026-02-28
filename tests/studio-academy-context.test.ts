import { describe, expect, it } from "vitest"

import { parseStudioAcademyContext } from "@/lib/academy/studio-query-context"

describe("parseStudioAcademyContext", () => {
  it("parses academy purchase context with first-time flag", () => {
    const parsed = parseStudioAcademyContext({
      source: "academy_purchase",
      product: "what_to_say",
      first_time_product_user: "true",
    })

    expect(parsed).toEqual({
      academyPurchaseSource: "academy_purchase",
      academyPurchaseProduct: "what_to_say",
      firstTimeProductUser: true,
    })
  })

  it("defaults first-time flag to false when omitted", () => {
    const parsed = parseStudioAcademyContext({
      source: "academy_purchase",
      product: "show_up",
    })

    expect(parsed).toEqual({
      academyPurchaseSource: "academy_purchase",
      academyPurchaseProduct: "show_up",
      firstTimeProductUser: false,
    })
  })

  it("returns undefined context for non-academy source", () => {
    const parsed = parseStudioAcademyContext({
      source: "foo",
      product: "what_to_say",
      first_time_product_user: "true",
    })

    expect(parsed).toEqual({
      academyPurchaseSource: undefined,
      academyPurchaseProduct: undefined,
      firstTimeProductUser: false,
    })
  })

  it("treats 1 as a true first-time flag", () => {
    const parsed = parseStudioAcademyContext({
      source: "academy_purchase",
      product: "get_paid",
      first_time_product_user: "1",
    })

    expect(parsed.firstTimeProductUser).toBe(true)
  })
})
