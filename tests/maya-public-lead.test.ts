import { describe, expect, it } from "vitest"

import { normalizeMayaPublicLeadInput } from "@/lib/maya/public-lead"

describe("normalizeMayaPublicLeadInput", () => {
  it("returns normalized payload for valid input", () => {
    const normalized = normalizeMayaPublicLeadInput({
      pageId: " maya_page_123 ",
      email: "  USER@Example.com ",
      name: "  Sandra  ",
      source: " landing_page_form ",
    })

    expect(normalized).toEqual({
      pageId: "maya_page_123",
      email: "user@example.com",
      name: "Sandra",
      source: "landing_page_form",
    })
  })

  it("returns null when required fields are missing or invalid", () => {
    expect(normalizeMayaPublicLeadInput({ pageId: "", email: "test@example.com" })).toBeNull()
    expect(normalizeMayaPublicLeadInput({ pageId: "maya_page_1", email: "not-an-email" })).toBeNull()
  })

  it("falls back to default source and nullable name", () => {
    const normalized = normalizeMayaPublicLeadInput({
      pageId: "maya_page_555",
      email: "member@sselfie.ai",
    })

    expect(normalized).toEqual({
      pageId: "maya_page_555",
      email: "member@sselfie.ai",
      name: null,
      source: "personal_page",
    })
  })
})
