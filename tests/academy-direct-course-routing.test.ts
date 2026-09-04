import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const brandedRoute = readFileSync("app/academy/access/branded-by-sselfie/page.tsx", "utf8")
const editingRoute = readFileSync("app/academy/access/editing-masterclass/page.tsx", "utf8")
const masterclassRoute = readFileSync("app/academy/access/masterclass/page.tsx", "utf8")
const brandShootRoute = readFileSync("app/academy/access/selfie-to-brand-shoot/page.tsx", "utf8")

describe("direct Academy course entry", () => {
  it.each([
    [brandedRoute, "branded_by_sselfie"],
    [editingRoute, "editing_masterclass"],
    [masterclassRoute, "branded_by_sselfie"],
  ])("resolves the live published course and opens its reader", (source, productId) => {
    expect(source).toContain(`product_id = '${productId}'`)
    expect(source).toContain("status = 'published'")
    expect(source).toContain("academy_view=courses&academy_course_id=${course.id}")
    expect(source).not.toMatch(/const COURSE_ID = \d+/)
  })

  it("renders Selfie to Brand Shoot directly for an active member", () => {
    expect(brandShootRoute).toContain("entitlementState.membershipActive ||")
    expect(brandShootRoute).toContain("<SelfieToBrandShootCourseShell")
  })
})
