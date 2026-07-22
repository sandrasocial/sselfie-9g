import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (path: string) => readFileSync(resolve(root, path), "utf8")

describe("Maya Operating Layer Phase 4 surface contract", () => {
  it("reduces the flagged Create surface to one recommendation, one composer, and one More control", () => {
    const shell = read("components/app-v3/app-v3-shell.tsx")
    const create = read("components/app-v3/visual-front-door.tsx")

    expect(shell).toContain("operatingLayerEnabled={mayaOperatingLayerEnabled}")
    expect(create).toContain("operatingLayerEnabled = false")
    expect(create).toContain('aria-controls="maya-create-more"')
    expect(create).toContain("More creation options")
    expect(create).toContain("operatingLayerEnabled && moreOpen")
  })

  it("keeps the five member surfaces primary and leaves Content behind the rollback flag", () => {
    const shell = read("components/app-v3/app-v3-shell.tsx")

    expect(shell).not.toContain('{ id: "content", label:')
    expect(shell).toContain('{section === "content" && (')
  })

  it("gives Gallery explicit Calendar and variation actions without deleting its stored asset", () => {
    const shell = read("components/app-v3/app-v3-shell.tsx")
    const gallery = read("components/app-v3/gallery-view.tsx")
    const lightbox = read("components/app-v3/image-lightbox.tsx")

    expect(shell).toContain("onUseInCalendar")
    expect(shell).toContain("onCreateVariation")
    expect(gallery).toContain("onUseInCalendar")
    expect(gallery).toContain("onCreateVariation")
    expect(lightbox).toContain("Use in Calendar")
    expect(lightbox).toContain("Create a variation")
  })

  it("routes flagged Calendar caption creation and improvement into the shared Maya action protocol", () => {
    const post = read("components/feed-planner/feed-post-card.tsx")
    const modals = read("components/feed-planner/feed-modals.tsx")
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(post).toContain("operatingLayerEnabled")
    expect(post).toContain("Improve with Maya")
    expect(post).toContain('onNavigateToMaya?.("improve_caption")')
    expect(modals).toContain("requestedAction")
    expect(concierge).toContain('kind: "improve_caption"')
    expect(concierge).toContain("MayaActionCard")
  })

  it("restores a completed caption action only for the same Calendar post and action", () => {
    const context = read("components/app-v3/concierge-context.tsx")

    expect(context).toContain("const canKeepCaptionAction")
    expect(context).toContain("existingTarget.requestedAction === target.requestedAction")
    expect(context).toContain("captionActionStatus: canKeepCaptionAction")
  })

  it("serves one automatic source-backed Learn recommendation and keeps the catalogue under Browse all", () => {
    const library = read("components/app-v3/library-view.tsx")

    expect(library).toContain("Maya recommends next")
    expect(library).toContain("Browse all")
    expect(library).toContain("Do this with Maya")
    expect(library).toContain("operatingLayerEnabled && !nextData.learningPlan")
  })

  it("keeps prompts, providers, credits, entitlements, payments, and publishing outside the Phase 4 diff", () => {
    const protectedFreeze = read("tests/maya-calendar-prompt-source-freeze.test.ts")
    expect(protectedFreeze).toContain("prompt-bearing")
  })
})
