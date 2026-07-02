// @vitest-environment node
// MAYA-FIX-02 item 1: edit mode must anchor likeness to the member's REAL selfie, not the
// previous generation, or 3-4 sequential edits compound the face away from the real person.

import { readFileSync } from "fs"
import path from "path"

import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function read(relativePath: string) {
  return readFileSync(path.join(ROOT, relativePath), "utf8")
}

describe("App v3 edit mode likeness (MAYA-FIX-02)", () => {
  const route = read("app/api/app-v3/maya/edit/route.ts")

  it("re-attaches the member's real selfie as an identity reference", () => {
    expect(route).toContain("resolveIdentitySelfieUrl")
    expect(route).toContain("user_avatar_images")
    expect(route).toContain("maya-edit-identity.png")
    // Both images go to the model: the image being edited plus the identity selfie.
    expect(route).toContain("editImages.length === 1 ? editImages[0] : editImages")
    expect(route).toContain("her real reference selfie")
  })

  it("matches the generate route's quality tier instead of hardcoding medium", () => {
    expect(route).toContain("APP_V3_IMAGE_QUALITY")
    expect(route).toContain("quality: EDIT_IMAGE_QUALITY")
    expect(route).not.toContain('quality: "medium"')
  })

  it("guards vanity-drift edits with the No-Fake doctrine", () => {
    expect(route).toContain("VANITY_DRIFT_PATTERN")
    // LIKENESS-MEMORY-01 moved the pattern to the shared lib so the note classifier and the
    // doctrine guard can never drift apart. The route imports it; the lib holds the regex.
    const lib = read("lib/app-v3/likeness-memory.ts")
    expect(lib).toMatch(/flawless\|perfect\|younger\|slimmer/)
    expect(route).toContain("natural best")
  })

  it("appends the technical avoid list to edit prompts", () => {
    expect(route).toContain("AVOID_LIST")
  })

  it("logs edit failures so failure rates are visible", () => {
    expect(route).toContain("suite_generation_failed")
  })
})

describe("App v3 generate failure logging", () => {
  const route = read("app/api/app-v3/maya/generate/route.ts")

  it("persists an analytics event on generation failure (sync and streaming paths)", () => {
    expect(route).toContain('source: "app-v3-generate"')
    expect(route).toContain('source: "app-v3-generate-stream"')
    const occurrences = route.split("suite_generation_failed").length - 1
    expect(occurrences).toBeGreaterThanOrEqual(2)
  })
})
