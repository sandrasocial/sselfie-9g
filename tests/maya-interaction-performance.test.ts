// @vitest-environment node

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const source = readFileSync(resolve(process.cwd(), "components/app-v3/maya-concierge.tsx"), "utf8")

describe("Maya interaction performance", () => {
  it("keeps repeated avatar and navigation renders memoized", () => {
    expect(source).toContain("const Avatar = memo(function Avatar")
    expect(source).toContain("const MayaPathTabs = memo(function MayaPathTabs")
    expect(source).toContain("const MayaJourneySteps = memo(function MayaJourneySteps")
  })

  it("allows a paint before opening image and profile overlays", () => {
    expect(source).toContain("window.requestAnimationFrame(() => {")
    expect(source).toContain("window.requestAnimationFrame(() => startTransition(update))")
    expect(source).toContain("afterInteractionPaint(() => setLightbox(next))")
    expect(source).toContain("afterInteractionPaint(() => setMemoryOpen(true))")
    expect(source).toMatch(
      /afterInteractionPaint\(\(\) => \{[\s\S]*setSelfieManagerInitialFocus\(initialFocus\)[\s\S]*setSelfieManagerOpen\(true\)/
    )
  })

  it("moves the heavy start actions out of their click event", () => {
    expect(source).toContain("onClick={() => afterInteractionPaint(onCreateWithMaya)}")
    expect(source).toContain("onClick={() => afterInteractionPaint(onCreateFromVault)}")
    expect(source).toContain(
      'onClick={() => afterInteractionPaint(() => onPickFormat("carousel"))}'
    )
  })
})
