import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"

import { resolveWeeklyPackageCalendarCopy } from "@/lib/app-v3/maya/weekly-package-context"

describe("Maya weekly package Calendar handoff", () => {
  it("replaces an unrelated open-slot caption context with Maya's chosen piece", () => {
    expect(
      resolveWeeklyPackageCalendarCopy({
        weeklyPackage: true,
        conceptTitle: "Three-part visibility carousel",
        captionContext: "Why showing your real face builds trust before the sale.",
        slotContentPillar: "Old launch reminder",
        slotCaption: "Enrollment closes tonight.",
      })
    ).toEqual({
      contentPillar:
        "Three-part visibility carousel. Why showing your real face builds trust before the sale.",
      caption: null,
    })
  })

  it("preserves the existing Calendar plan for ordinary placements", () => {
    expect(
      resolveWeeklyPackageCalendarCopy({
        weeklyPackage: false,
        conceptTitle: "A portrait",
        captionContext: "A different idea",
        slotContentPillar: "Founder story",
        slotCaption: "The planned founder caption.",
      })
    ).toEqual({
      contentPillar: "Founder story",
      caption: "The planned founder caption.",
    })
  })

  it("returns the original Calendar receipt when a committed placement is retried", () => {
    const route = readFileSync("app/api/app-v3/maya/feed-plan/place-photo/route.ts", "utf8")

    expect(route).toContain("const [existingPlacement]")
    expect(route).toContain("ai_image_id = ${normalizedAiImageId} OR image_url = ${legacyImageUrl}")
    expect(route).toContain("alreadyPlaced: true")
    expect(route.indexOf("const [existingPlacement]")).toBeLessThan(
      route.indexOf("const [openSlot]")
    )
  })
})
