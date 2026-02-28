import { describe, expect, it } from "vitest"

import { parseAcademyViewParam } from "@/lib/academy/view-routing"

describe("parseAcademyViewParam", () => {
  it("accepts canonical academy views", () => {
    expect(parseAcademyViewParam("overview")).toBe("overview")
    expect(parseAcademyViewParam("monthly-drops")).toBe("monthly-drops")
    expect(parseAcademyViewParam("flatlay-images")).toBe("flatlay-images")
  })

  it("normalizes snake_case aliases for deep links", () => {
    expect(parseAcademyViewParam("monthly_drops")).toBe("monthly-drops")
    expect(parseAcademyViewParam("flatlay_images")).toBe("flatlay-images")
  })

  it("returns null for empty or unknown values", () => {
    expect(parseAcademyViewParam("")).toBeNull()
    expect(parseAcademyViewParam("unknown")).toBeNull()
    expect(parseAcademyViewParam(undefined)).toBeNull()
  })
})
