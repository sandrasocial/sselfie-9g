import { describe, expect, it } from "vitest"

import {
  buildWorkWithMeContactDraft,
  buildWorkWithMeOfferDraft,
  buildWorkWithMeSalesBrief,
} from "@/lib/work-with-me/sales-assistant"

const application = {
  name: "Harmony Example",
  currentChallenge: "I have a real estate business, but people do not understand what makes me different.",
  desiredOutcome: "More qualified buyer and seller conversations.",
  currentOffer: "Private help for buyers and sellers in my local market.",
  investmentReadiness: "yes",
}

describe("Work With Me sales assistant", () => {
  it("prepares a personal fit-call invitation without sending or overpromising", () => {
    const draft = buildWorkWithMeContactDraft(application)

    expect(draft).toContain("Hi Harmony,")
    expect(draft).toContain("Private help for buyers and sellers")
    expect(draft).toContain("short fit call")
    expect(draft).not.toContain("guarantee")
    expect(draft).not.toContain("income")
  })

  it("prepares one focused paid offer note around the verified checkout", () => {
    const draft = buildWorkWithMeOfferDraft({
      ...application,
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_live_example",
    })

    expect(draft).toContain("€2,000 paid in full")
    expect(draft).toContain("two weeks of preparation")
    expect(draft).toContain("four weekly 45-minute calls")
    expect(draft).toContain("https://checkout.stripe.com/c/pay/cs_live_example")
    expect(draft).toContain("one clear offer")
  })

  it("turns the application into a compact call brief", () => {
    const brief = buildWorkWithMeSalesBrief(application)

    expect(brief).toContain("Offer now:")
    expect(brief).toContain("What feels stuck:")
    expect(brief).toContain("What she wants next:")
    expect(brief).toContain("Investment readiness: yes")
  })
})
