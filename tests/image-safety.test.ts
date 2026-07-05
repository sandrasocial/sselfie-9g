// @vitest-environment node

import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { isContentPolicyError, sanitizePromptForImageSafety } from "@/lib/ai/image-safety"

describe("lib/ai/image-safety", () => {
  it("recognizes OpenAI moderation/content-policy rejections", () => {
    expect(isContentPolicyError(new Error("400 rejected by the safety system"))).toBe(true)
    expect(isContentPolicyError(new Error("Your request was rejected: content_policy_violation"))).toBe(
      true
    )
    expect(isContentPolicyError({ message: "moderation_blocked", code: "moderation_blocked" })).toBe(
      true
    )
    expect(isContentPolicyError(new Error("No image data returned from OpenAI"))).toBe(false)
    expect(isContentPolicyError(new Error("Could not load reference selfie"))).toBe(false)
  })

  it("softens wardrobe words the same way Shoot Studio's proven list always has", () => {
    const softened = sanitizePromptForImageSafety(
      "Outfit: a deep v neckline lace bodysuit with an open back."
    )
    expect(softened).not.toMatch(/deep\s+v\s+neckline/i)
    expect(softened).not.toMatch(/lace/i)
    expect(softened).not.toMatch(/bodysuit/i)
    expect(softened).not.toMatch(/open\s+back/i)
    expect(softened).toContain("Keep the styling modest, fully clothed, elegant, and tasteful.")
  })

  it("NEW 2026-07-05: softens setting/pose language a wardrobe-only list would miss", () => {
    // Real incident: two story-sequence rejections (safety_violations=[sexual]) on personal-
    // story content with no wardrobe trigger word present at all - the gap this list closes.
    const softened = sanitizePromptForImageSafety(
      "Scene: sitting on the bed in the bedroom, wrapped in a towel after getting undressed."
    )
    expect(softened).not.toMatch(/\bin the bedroom\b/i)
    expect(softened).not.toMatch(/wrapped in a towel/i)
    expect(softened).not.toMatch(/getting undressed/i)
    expect(softened).toContain("in her living room, fully dressed")
  })

  it("still applies the intimate -> quiet swap before the new setting scrub runs", () => {
    const softened = sanitizePromptForImageSafety("An intimate moment getting ready for the day.")
    expect(softened).toContain("quiet moment")
    expect(softened).not.toContain("intimate")
  })
})
