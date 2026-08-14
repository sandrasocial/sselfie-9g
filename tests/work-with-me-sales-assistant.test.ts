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
  aiAttempts: "I tried ChatGPT, but the writing felt generic.",
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
    expect(draft).toContain("Over six weeks")
    expect(draft).toContain("four private 45-minute calls")
    expect(draft).toContain("https://checkout.stripe.com/c/pay/cs_live_example")
    expect(draft).toContain("personal AI content team")
    expect(draft).toContain("Business Brain")
    expect(draft).toContain("first 30 days of marketing")
    expect(draft).not.toContain("guarantee")
  })

  it("turns the application into a compact call brief", () => {
    const brief = buildWorkWithMeSalesBrief(application)

    expect(brief).toContain("Offer now:")
    expect(brief).toContain("Marketing burden:")
    expect(brief).toContain("Weekly help wanted:")
    expect(brief).toContain("AI attempts:")
    expect(brief).toContain("Investment readiness: yes")
  })
})
