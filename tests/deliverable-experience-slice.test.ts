import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("deliverable experience slice", () => {
  it("gives Masterclass buyers a guided implementation path in Academy", () => {
    const library = readFileSync("app/academy/_lib/course-library.ts", "utf8")
    const academyPage = readFileSync("app/academy/page.tsx", "utf8")

    expect(library).toContain("getMasterclassImplementationPath")
    expect(library).toContain("Clarify your offer")
    expect(library).toContain("Publish for 30 days")
    expect(library).toContain("/academy/access/brand-strategy")
    expect(academyPage).toContain("Recommended Path")
    expect(academyPage).toContain("implementationPath")
  })

  it("frames Brand Strategy setup as a guided strategy deliverable", () => {
    const setupForm = readFileSync("components/brand-strategy/brand-strategy-setup-form.tsx", "utf8")

    expect(setupForm).toContain("Start with your strategy")
    expect(setupForm).toContain("Positioning")
    expect(setupForm).toContain("Content Direction")
    expect(setupForm).toContain("Next Action")
    expect(setupForm).toContain("does not guarantee income or business results")
  })

  it("avoids stale fixed lesson-count copy on the Masterclass sales page", () => {
    const marketing = readFileSync("components/sselfie/public-marketing.tsx", "utf8")

    expect(marketing).toContain("Implementation map")
    expect(marketing).not.toContain("All fourteen lessons")
    expect(marketing).not.toContain("Fourteen lessons.")
  })
})
