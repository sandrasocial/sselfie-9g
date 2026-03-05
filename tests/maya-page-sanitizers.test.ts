import { describe, expect, it } from "vitest"

import {
  sanitizeHeadline,
  sanitizePageTitle,
  sanitizeUserFacingText,
} from "@/lib/maya/page-generation/sanitizers"

describe("maya page sanitizers", () => {
  it("removes markdown tokens and emoji noise", () => {
    const value = sanitizeUserFacingText("### **Launch** this offer now 🚀 [CREATE_ASSET:page]")
    expect(value).not.toContain("###")
    expect(value).not.toContain("**")
    expect(value).not.toContain("[CREATE_ASSET")
    expect(value).not.toContain("🚀")
  })

  it("creates safe headline fallback", () => {
    expect(sanitizeHeadline("###")).toBe("Build your next offer with Maya")
  })

  it("sanitizes page titles by asset type", () => {
    expect(sanitizePageTitle("page", "### Landing Page: **Offer**")).toContain("Landing Page")
    expect(sanitizePageTitle("calendar", "")).toBe("Content Calendar")
    expect(sanitizePageTitle("pdf", "")).toBe("Workbook")
  })
})
