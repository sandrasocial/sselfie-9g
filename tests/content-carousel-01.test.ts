// @vitest-environment node

import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8")
}

describe("CONTENT-CAROUSEL-01 tutorial carousel mode", () => {
  it("adds the tutorial slide contract to the shared carousel schema", () => {
    const types = read("lib/content-kit/types.ts")

    expect(types).toContain('| "before-after"')
    expect(types).toContain("export type ContentAccent")
    expect(types).toContain("accents?: ContentAccent[]")
    expect(types).toContain('| "full"')
    expect(types).toContain('fit?: "cover" | "contain"')
  })

  it("keeps the neutral tutorial accent scoped and reusable", () => {
    const accents = read("lib/content-kit/accents.tsx")
    const designSystem = read("docs/SSELFIE_DESIGN_SYSTEM.md")

    expect(accents).toContain('TUTORIAL_ACCENT = "#3A3A3A"')
    expect(designSystem).toContain("tutorial carousel annotations")
  })

  it("routes tutorial generation through content_reel_references and a separate mode", () => {
    const generator = read("lib/content-kit/carousel-generator.ts")

    expect(generator).toContain('mode?: "standard" | "tutorial"')
    expect(generator).toContain("listContentReelReferences")
    expect(generator).toContain("FROM content_reel_references")
    expect(generator).toContain("generateTutorialCarousels")
    // Before-after is no longer forced; when present it composites the polished photo + selfie thumb.
    expect(generator).toContain('slide.kind === "before-after"')
    expect(generator).toContain("never force one in")
    expect(generator).toContain("Each carousel: 7 to 10 slides")
  })

  it("passes baked model-designed slides through without drawing extra text", () => {
    const route = read("app/api/admin/content-kit/render/[id]/[slide]/route.tsx")

    expect(route).toContain("function BeforeAfterFrame")
    expect(route).toContain('slide.kind === "before-after"')
    expect(route).toContain("SlideAccents")
    expect(route).toContain('slide.headlineRender === "baked"')
    expect(route).toContain("PNG pass-through")
  })

  it("exposes tutorial carousel creation through admin Maya and the admin API", () => {
    const mayaRoute = read("app/api/app-v3/maya/chat/route.ts")
    const adminRoute = read("app/api/admin/content-kit/route.ts")

    expect(mayaRoute).toContain("createAdminTutorialCarousel")
    expect(mayaRoute).toContain("create_admin_tutorial_carousel")
    expect(mayaRoute).toContain("content_reel_references")
    expect(adminRoute).toContain('body.mode === "tutorial"')
    expect(adminRoute).toContain("reelReferenceIds")
  })
})
