import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const layoutSource = readFileSync("app/app/layout.tsx", "utf8")
const shellSource = readFileSync("components/app-v3/app-v3-shell.tsx", "utf8")
const mayaSource = readFileSync("components/app-v3/maya-concierge.tsx", "utf8")
const gallerySource = readFileSync("components/app-v3/gallery-view.tsx", "utf8")
const librarySource = readFileSync("components/app-v3/library-view.tsx", "utf8")
const accountSource = readFileSync("components/app-v3/account-view.tsx", "utf8")
const calendarSource = readFileSync("components/app-v3/feed-planner-view.tsx", "utf8")

describe("Studio 3.0 cool suite theme", () => {
  it("defines the approved cool-toned depth palette without warm app tokens", () => {
    expect(layoutSource).toContain("--suite-canvas: #f4f7f8")
    expect(layoutSource).toContain("--suite-smoke: #e3e8eb")
    expect(layoutSource).toContain("--suite-mist: #d7e0e5")
    expect(layoutSource).toContain("--suite-steel: #aeb9c1")
    expect(layoutSource).toContain("--suite-slate: #5d6a73")
    expect(layoutSource).toContain("--suite-graphite: #252c31")
    expect(layoutSource).not.toMatch(/--suite-(?:cream|beige|taupe|gold)/)
  })

  it("applies the theme to Maya and every primary SUITE surface", () => {
    expect(shellSource).toContain("suite-canvas")
    expect(shellSource).toContain("suite-bottom-nav")
    expect(shellSource).toContain("suite-bottom-nav-item--active")
    expect(mayaSource).toContain("suite-maya-panel")
    expect(gallerySource).toContain("suite-page")
    expect(librarySource).toContain("suite-page")
    expect(accountSource).toContain("suite-page")
    expect(calendarSource).toContain("suite-page")
  })
})
