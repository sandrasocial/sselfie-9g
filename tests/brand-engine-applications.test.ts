import { describe, expect, it } from "vitest"
import {
  calculateQualificationScore,
  deriveCheckoutExperienceDecision,
  deriveLaunchRoutingDecision,
  enforceSourceAwareRouting,
  normalizeLeadSourceChannel,
  resolveLeadSource,
  scoreWorkWithMeLead,
} from "@/lib/brand-engine/applications"

describe("brand-engine qualification scoring", () => {
  it("scores high-intent cohort leads as qualified", () => {
    const result = calculateQualificationScore({
      revenue: "250-500k",
      currentSpend: "1500-3000",
      hoursPerWeek: "10",
      readyToInvest: "yes",
      offerType: "cohort",
      biggestBottleneck: "Need a repeatable content and sales system to scale",
      businessDescription: "Coaching business with monthly recurring clients",
      whyInterested: "Want to launch a consistent funnel this month",
    })

    expect(result.qualified).toBe(true)
    expect(result.score).toBeGreaterThanOrEqual(70)
    expect(result.pipelineStage).toBe("qualified_queue")
  })

  it("routes low-readiness leads to nurture", () => {
    const result = calculateQualificationScore({
      revenue: "<50k",
      currentSpend: "0-500",
      hoursPerWeek: "5",
      readyToInvest: "no",
      offerType: "vip",
      biggestBottleneck: "I am exploring ideas",
      businessDescription: "Early stage project",
      whyInterested: "Just curious",
    })

    expect(result.qualified).toBe(false)
    expect(result.pipelineStage).toBe("nurture")
    expect(result.priorityTier).toBe("low")
  })
})

describe("Work With Me lead scoring", () => {
  it("routes established founder-bottleneck applicants to a fit call", () => {
    const result = scoreWorkWithMeLead({
      currentChallenge: "I have a service business but every plan and follow-up depends on me.",
      desiredOutcome: "I want reliable help with research, planning, writing, and repeatable work.",
      currentOffer: "Consulting offer for business owners",
      aiAttempts: "I tried ChatGPT but it forgets my business and sounds generic.",
      helpFocus: "Too much of the business depends on me. I need help that knows how it works.",
      investmentReadiness: "Yes",
      instagramHandle: "@sandra",
    })

    expect(result.qualified).toBe(true)
    expect(result.score).toBeGreaterThanOrEqual(80)
    expect(result.pipelineStage).toBe("qualified_queue")
    expect(result.nextAction).toBe("book_call")
    expect(result.priorityTier).toBe("high")
    expect(result.workDependsOnFounder).toBe(true)
    expect(result.clearRecurringWork).toBe(true)
  })

  it("keeps low-readiness curiosity applications out of the payment-link path", () => {
    const result = scoreWorkWithMeLead({
      currentChallenge: "I am just curious.",
      desiredOutcome: "Maybe make prettier photos one day.",
      currentOffer: "",
      aiAttempts: "",
      helpFocus: "",
      investmentReadiness: "No",
      instagramHandle: "",
    })

    expect(result.qualified).toBe(false)
    expect(result.status).toBe("needs_follow_up")
    expect(result.pipelineStage).toBe("nurture")
    expect(result.nextAction).toBe("nurture_followup")
  })
})

describe("brand-engine lead source resolver", () => {
  it("normalizes source values", () => {
    expect(resolveLeadSource("Instagram_Story", "utm=launch")).toEqual({
      channel: "instagram_story",
      detail: "utm=launch",
    })
  })

  it("falls back to unknown source", () => {
    expect(resolveLeadSource("", "")).toEqual({
      channel: "unknown",
      detail: null,
    })
  })

  it("normalizes manychat source aliases", () => {
    expect(normalizeLeadSourceChannel("manychat")).toBe("manychat_dm")
    expect(normalizeLeadSourceChannel("instagram_direct")).toBe("instagram_dm")
    expect(normalizeLeadSourceChannel("manual")).toBe("admin_manual")
  })
})

describe("brand-engine launch routing", () => {
  it("routes high-fit cohort leads to direct-offer path", () => {
    const qualification = calculateQualificationScore({
      revenue: "250-500k",
      currentSpend: "1500-3000",
      hoursPerWeek: "10",
      readyToInvest: "yes",
      offerType: "cohort",
      biggestBottleneck: "Need a consistent system and funnel that converts",
      businessDescription: "Established coaching program",
      whyInterested: "Ready to implement now and close clients this month",
    })

    const routing = deriveLaunchRoutingDecision({
      offerType: "cohort",
      readyToInvest: "yes",
      qualificationScore: qualification.score,
      qualified: qualification.qualified,
    })

    expect(routing.routingPath).toBe("direct_offer")
    expect(routing.nextAction).toBe("send_offer")
    expect(routing.pipelineStage).toBe("qualified_queue")
  })

  it("routes qualified but lower-intent cohort leads to fit-call path", () => {
    const qualification = calculateQualificationScore({
      revenue: "100-250k",
      currentSpend: "500-1500",
      hoursPerWeek: "10",
      readyToInvest: "maybe",
      offerType: "cohort",
      biggestBottleneck: "I need support building content consistency",
      businessDescription: "Service business with early traction",
      whyInterested: "Need a clear path before committing",
    })

    const routing = deriveLaunchRoutingDecision({
      offerType: "cohort",
      readyToInvest: "maybe",
      qualificationScore: qualification.score,
      qualified: qualification.qualified,
    })

    expect(routing.routingPath).toBe("fit_call")
    expect(routing.nextAction).toBe("book_call")
    expect(routing.pipelineStage).toBe("qualified_queue")
  })

  it("routes unqualified leads to nurture", () => {
    const routing = deriveLaunchRoutingDecision({
      offerType: "cohort",
      readyToInvest: "no",
      qualificationScore: 35,
      qualified: false,
    })

    expect(routing.routingPath).toBe("nurture")
    expect(routing.nextAction).toBe("nurture_followup")
    expect(routing.pipelineStage).toBe("nurture")
  })
})

describe("brand-engine checkout experience routing", () => {
  it("prefers embedded checkout for direct-offer web leads", () => {
    const decision = deriveCheckoutExperienceDecision({
      routingPath: "direct_offer",
      sourceChannel: "website",
    })

    expect(decision.checkoutMode).toBe("embedded_checkout")
  })

  it("uses payment link for assisted direct-offer leads", () => {
    const decision = deriveCheckoutExperienceDecision({
      routingPath: "direct_offer",
      sourceChannel: "instagram_dm",
    })

    expect(decision.checkoutMode).toBe("payment_link")
  })

  it("returns none for non-direct-offer paths", () => {
    const decision = deriveCheckoutExperienceDecision({
      routingPath: "fit_call",
      sourceChannel: "website",
    })

    expect(decision.checkoutMode).toBe("none")
  })
})

describe("source-aware routing guardrails", () => {
  it("forces fit-call routing for manychat leads", () => {
    const routed = enforceSourceAwareRouting({
      sourceChannel: "manychat_dm",
      routingPath: "direct_offer",
      nextAction: "send_offer",
      callRequired: false,
      checkoutMode: "embedded_checkout",
      checkoutModeReason: "self_serve_web_source",
    })

    expect(routed.routingPath).toBe("fit_call")
    expect(routed.nextAction).toBe("book_call")
    expect(routed.callRequired).toBe(true)
    expect(routed.checkoutMode).toBe("none")
    expect(routed.checkoutModeReason).toBe("dm_bridge_fit_call_required")
  })

  it("keeps web leads on their existing routing", () => {
    const routed = enforceSourceAwareRouting({
      sourceChannel: "website",
      routingPath: "direct_offer",
      nextAction: "send_offer",
      callRequired: false,
      checkoutMode: "embedded_checkout",
      checkoutModeReason: "self_serve_web_source",
    })

    expect(routed.routingPath).toBe("direct_offer")
    expect(routed.nextAction).toBe("send_offer")
    expect(routed.callRequired).toBe(false)
    expect(routed.checkoutMode).toBe("embedded_checkout")
  })
})
