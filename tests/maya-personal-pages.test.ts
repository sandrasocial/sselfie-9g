import { describe, expect, it } from "vitest"

import { buildPersonalPageSlug, sanitizePublicSlug } from "@/lib/maya/personal-pages"

describe("sanitizePublicSlug", () => {
  it("normalizes text into a URL-safe slug", () => {
    expect(sanitizePublicSlug("  My Luxury Offer Page  ")).toBe("my-luxury-offer-page")
  })

  it("removes special characters and accents", () => {
    expect(sanitizePublicSlug("Áría @ Studio!!!")).toBe("aria-studio")
  })

  it("returns empty string for invalid values", () => {
    expect(sanitizePublicSlug("___")).toBe("")
  })
})

describe("buildPersonalPageSlug", () => {
  it("adds stable suffix from asset id", () => {
    const slug = buildPersonalPageSlug({
      assetType: "page",
      title: "My Offer",
      assetId: "maya_page_abc123xyz",
    })

    expect(slug).toContain("my-offer")
    expect(slug).toMatch(/-[a-z0-9]{6}$/)
  })

  it("falls back to type prefix when title is empty", () => {
    const slug = buildPersonalPageSlug({
      assetType: "calendar",
      title: "",
      assetId: "maya_calendar_foo987",
    })
    expect(slug.startsWith("calendar-")).toBe(true)
  })
})
