import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const layoutSource = readFileSync("app/app/layout.tsx", "utf8")
const shellSource = readFileSync("components/app-v3/app-v3-shell.tsx", "utf8")
const mayaSource = readFileSync("components/app-v3/maya-concierge.tsx", "utf8")
const gallerySource = readFileSync("components/app-v3/gallery-view.tsx", "utf8")
const librarySource = readFileSync("components/app-v3/library-view.tsx", "utf8")
const accountSource = readFileSync("components/app-v3/account-view.tsx", "utf8")
const calendarSource = readFileSync("components/app-v3/feed-planner-view.tsx", "utf8")

describe("Studio 3.0 Bold Editorial suite theme", () => {
  it("defines the approved Bold Editorial palette without warm app tokens", () => {
    expect(layoutSource).toContain("--suite-canvas: var(--ss-brand-chalk)")
    expect(layoutSource).toContain("--suite-smoke: var(--ss-brand-concrete)")
    expect(layoutSource).toContain("--suite-steel: var(--ss-brand-silver)")
    expect(layoutSource).toContain("--suite-slate: var(--ss-brand-slate)")
    expect(layoutSource).toContain("--suite-graphite: var(--ss-brand-carbon)")
    expect(layoutSource).toContain("--suite-accent: var(--ss-brand-oxblood)")
    expect(layoutSource).not.toMatch(/--suite-(?:cream|beige|taupe|gold)/)
  })

  it("applies the theme to Maya and every primary SUITE surface", () => {
    expect(shellSource).toContain("suite-canvas")
    expect(shellSource).toContain("SuiteEditorialNavigation")
    expect(mayaSource).toContain("suite-maya-panel")
    expect(gallerySource).toContain("suite-page")
    expect(librarySource).toContain("suite-page")
    expect(accountSource).toContain("suite-page")
    expect(calendarSource).toContain("suite-page")
  })
})
