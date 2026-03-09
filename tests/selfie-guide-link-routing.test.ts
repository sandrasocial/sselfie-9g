// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

describe("selfie guide content links", () => {
  it("uses the approved CTA routes in the guide markdown", () => {
    const guideContents = fs.readFileSync(
      path.join(ROOT, "content-templates", "selfie-guide-content-v3.md"),
      "utf8",
    )

    expect(guideContents).toContain("[Open Maya in Studio](/auth/sign-up?returnTo=%2Fstudio%3Ftab%3Dmaya)")
    expect(guideContents).toContain("[Get the $19 Brand Strategy](/checkout/brand-strategy-pack)")
    expect(guideContents).toContain("[Join Studio Membership](/checkout/membership)")
    expect(guideContents).not.toContain("[Open Maya in Studio](/studio?tab=maya)")
    expect(guideContents).not.toContain("[Get the €17 Brand Strategy](/brand-strategy)")
  })
})
