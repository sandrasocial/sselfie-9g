import { describe, expect, it } from "vitest"

import { deriveHasExtensionData, deriveHasSelfies } from "@/lib/onboarding/status"

describe("deriveHasSelfies", () => {
  it("returns true when avatar images exist", () => {
    expect(deriveHasSelfies(1)).toBe(true)
    expect(deriveHasSelfies(3)).toBe(true)
  })

  it("returns false when no avatar images exist", () => {
    expect(deriveHasSelfies(0)).toBe(false)
  })
})

describe("deriveHasExtensionData", () => {
  it("accepts dream client from formData object with feed style", () => {
    expect(
      deriveHasExtensionData({
        formData: { dreamClient: "Coaches" },
        feedStyle: "modern-clean",
      }),
    ).toBe(true)
  })

  it("accepts dream client from column fallback with feed style", () => {
    expect(
      deriveHasExtensionData({
        dreamClient: "Founders",
        feedStyle: "editorial",
      }),
    ).toBe(true)
  })

  it("returns false when feed style or dream client is missing", () => {
    expect(deriveHasExtensionData({ dreamClient: "Founders", feedStyle: "" })).toBe(false)
    expect(deriveHasExtensionData({ formData: { dreamClient: "" }, feedStyle: "editorial" })).toBe(false)
    expect(deriveHasExtensionData(undefined)).toBe(false)
  })
})
