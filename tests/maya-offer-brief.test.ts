import { describe, expect, it } from "vitest"

import {
  buildOfferBriefInstruction,
  encodeOfferBriefCollectionPayload,
  encodeOfferBriefMarkerPayload,
  parseOfferBriefCollectionPayload,
  parseOfferBriefSubmissionMarker,
  toOfferBriefFromPartial,
  stripOfferBriefSubmissionMarker,
  summarizeOfferBriefForMemory,
} from "@/lib/maya/offer-brief"

describe("maya offer brief marker parsing", () => {
  const brief = {
    assetType: "page" as const,
    designStyle: "luxury editorial",
    offerType: "1:1 Coaching",
    transformation: "Help founders sign their first premium clients",
    pricePoint: "€497",
    formatAndDuration: "4-week program",
    idealClient: "Female founders launching first offer",
    biggestStruggle: "Inconsistent sales messaging",
    uniqueMethod: "Message to Money framework",
    proofPoints: "12 clients signed in 90 days",
    callToAction: "Book strategy call",
  }

  it("parses encoded submit marker payload", () => {
    const payload = encodeOfferBriefMarkerPayload(brief)
    const parsed = parseOfferBriefSubmissionMarker(`Here you go [SUBMIT_OFFER_BRIEF:${payload}]`)

    expect(parsed).toEqual(brief)
  })

  it("strips submit marker from visible text", () => {
    const payload = encodeOfferBriefMarkerPayload(brief)
    const stripped = stripOfferBriefSubmissionMarker(`My brief [SUBMIT_OFFER_BRIEF:${payload}]`)
    expect(stripped).toBe("My brief")
  })

  it("builds deterministic instruction and memory summary", () => {
    const instruction = buildOfferBriefInstruction(brief)
    const memorySummary = summarizeOfferBriefForMemory(brief)

    expect(instruction).toContain("landing page draft. Offer: 1:1 Coaching.")
    expect(instruction).not.toContain("high-converting")
    expect(instruction).toContain("Design direction: luxury editorial.")
    expect(instruction).toContain("1:1 Coaching")
    expect(memorySummary).toContain("Design style: luxury editorial")
    expect(memorySummary).toContain("Offer: 1:1 Coaching")
    expect(memorySummary).toContain("Ideal client: Female founders")
  })

  it("supports calendar briefs and returns instagram-specific instruction", () => {
    const calendarBrief = {
      ...brief,
      assetType: "calendar" as const,
    }

    const instruction = buildOfferBriefInstruction(calendarBrief)
    const payload = encodeOfferBriefMarkerPayload(calendarBrief)
    const parsed = parseOfferBriefSubmissionMarker(`[SUBMIT_OFFER_BRIEF:${payload}]`)

    expect(instruction).toContain("Instagram content calendar draft")
    expect(instruction).toContain("9-post Instagram plan")
    expect(parsed?.assetType).toBe("calendar")
  })

  it("encodes and parses collection payload for prefilled briefs", () => {
    const payload = encodeOfferBriefCollectionPayload({
      assetType: "page",
      prefill: {
        offerType: "1:1 Coaching",
        transformation: "Help founders sign clients",
        idealClient: "Female founders",
      },
      missingFields: ["pricePoint"],
    })

    const parsed = parseOfferBriefCollectionPayload(payload)
    expect(parsed).toEqual({
      assetType: "page",
      prefill: {
        offerType: "1:1 Coaching",
        transformation: "Help founders sign clients",
        idealClient: "Female founders",
      },
      missingFields: ["pricePoint"],
    })
  })

  it("builds a full brief from partial data when core fields exist", () => {
    const built = toOfferBriefFromPartial({
      offerType: "Coaching",
      transformation: "Book premium clients",
      idealClient: "Creators",
    })
    expect(built).toEqual({
      assetType: "page",
      designStyle: "",
      offerType: "Coaching",
      transformation: "Book premium clients",
      pricePoint: "",
      formatAndDuration: "",
      idealClient: "Creators",
      biggestStruggle: "",
      uniqueMethod: "",
      proofPoints: "",
      callToAction: "",
    })
  })
})
