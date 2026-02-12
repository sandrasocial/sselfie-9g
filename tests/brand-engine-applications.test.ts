import { describe, expect, it } from "vitest"
import {
  calculateQualificationScore,
  resolveLeadSource,
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
})
