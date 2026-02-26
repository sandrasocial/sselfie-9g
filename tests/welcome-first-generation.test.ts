import { describe, expect, it } from "vitest"

import {
  isWelcomeFlowEnabled,
  shouldShowWelcomeFirstGenerationFlow,
} from "@/lib/onboarding/welcome-first-generation"

describe("isWelcomeFlowEnabled", () => {
  it("returns true for true-ish env values", () => {
    expect(isWelcomeFlowEnabled("true")).toBe(true)
    expect(isWelcomeFlowEnabled("1")).toBe(true)
  })

  it("returns false for false-ish env values", () => {
    expect(isWelcomeFlowEnabled(undefined)).toBe(false)
    expect(isWelcomeFlowEnabled("false")).toBe(false)
    expect(isWelcomeFlowEnabled("0")).toBe(false)
    expect(isWelcomeFlowEnabled("")).toBe(false)
  })
})

describe("shouldShowWelcomeFirstGenerationFlow", () => {
  it("shows for users created within 24h with no generations and bonus + no image spend", () => {
    const now = new Date("2026-02-19T12:00:00.000Z")
    expect(
      shouldShowWelcomeFirstGenerationFlow({
        enabled: true,
        userCreatedAt: "2026-02-19T01:00:00.000Z",
        hasAnyGeneration: false,
        hasBonusCredits: true,
        hasNoImageSpend: true,
        now,
      }),
    ).toBe(true)
  })

  it("hides when user has no bonus credits", () => {
    const now = new Date("2026-02-19T12:00:00.000Z")
    expect(
      shouldShowWelcomeFirstGenerationFlow({
        enabled: true,
        userCreatedAt: "2026-02-19T01:00:00.000Z",
        hasAnyGeneration: false,
        hasBonusCredits: false,
        hasNoImageSpend: true,
        now,
      }),
    ).toBe(false)
  })

  it("hides when user has image spend", () => {
    const now = new Date("2026-02-19T12:00:00.000Z")
    expect(
      shouldShowWelcomeFirstGenerationFlow({
        enabled: true,
        userCreatedAt: "2026-02-19T01:00:00.000Z",
        hasAnyGeneration: false,
        hasBonusCredits: true,
        hasNoImageSpend: false,
        now,
      }),
    ).toBe(false)
  })

  it("hides when user is older than 24h", () => {
    const now = new Date("2026-02-19T12:00:00.000Z")
    expect(
      shouldShowWelcomeFirstGenerationFlow({
        enabled: true,
        userCreatedAt: "2026-02-18T10:59:59.000Z",
        hasAnyGeneration: false,
        hasBonusCredits: true,
        hasNoImageSpend: true,
        now,
      }),
    ).toBe(false)
  })

  it("hides when user already generated at least one image", () => {
    const now = new Date("2026-02-19T12:00:00.000Z")
    expect(
      shouldShowWelcomeFirstGenerationFlow({
        enabled: true,
        userCreatedAt: "2026-02-19T01:00:00.000Z",
        hasAnyGeneration: true,
        hasBonusCredits: true,
        hasNoImageSpend: true,
        now,
      }),
    ).toBe(false)
  })

  it("hides when feature is disabled", () => {
    const now = new Date("2026-02-19T12:00:00.000Z")
    expect(
      shouldShowWelcomeFirstGenerationFlow({
        enabled: false,
        userCreatedAt: "2026-02-19T01:00:00.000Z",
        hasAnyGeneration: false,
        hasBonusCredits: true,
        hasNoImageSpend: true,
        now,
      }),
    ).toBe(false)
  })
})
