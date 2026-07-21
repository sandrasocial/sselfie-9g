// @vitest-environment node

import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8")

describe("Maya operating layer Phase 2 integration contract", () => {
  it("keeps one shared typed action lifecycle", () => {
    const protocol = read("lib/app-v3/maya/action-protocol.ts")
    const card = read("components/app-v3/maya-action-card.tsx")

    for (const status of [
      "recommended",
      "previewing",
      "awaiting_confirmation",
      "executing",
      "succeeded",
      "failed",
      "undone",
    ]) {
      expect(protocol).toContain(`"${status}"`)
    }
    expect(card).toContain("mayaActionReducer")
  })

  it("wraps the existing generator and Calendar mutations without adding a universal backend", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const routes = fs.readdirSync("app/api/app-v3/maya").filter(entry => entry.includes("action"))

    expect(concierge).toContain("MayaActionCard")
    expect(concierge).toContain("/api/app-v3/maya/generate")
    expect(concierge).toContain("replace-post-image")
    expect(concierge).toContain("undoCalendarDelivery")
    expect(routes).toEqual([])
  })

  it("keeps direct utilities outside the Maya action protocol", () => {
    const card = read("components/app-v3/concept-card.tsx")
    expect(card).toContain("Download")
    expect(card).toContain("Edit photo")
    expect(card).not.toContain('kind: "download"')
    expect(card).not.toContain('kind: "edit"')
  })

  it("snapshots both image and caption assignments before reversible Calendar apply", () => {
    const types = read("components/app-v3/types.ts")
    const context = read("components/app-v3/concierge-context.tsx")
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(types).toContain("previousCaption")
    expect(types).toContain("deliveredCaption")
    expect(context).toContain("caption: delivery.deliveredCaption")
    expect(context).toContain("caption: prev.calendarTarget.delivery?.previousCaption")
    expect(concierge).toContain("/update-caption")
    expect(concierge).toContain("target.delivery.previousCaption")
  })

  it("does not expose publishing as an action kind", () => {
    const protocol = read("lib/app-v3/maya/action-protocol.ts")
    expect(protocol).not.toContain('"publish"')
    expect(protocol).not.toContain('"schedule_post"')
  })
})
