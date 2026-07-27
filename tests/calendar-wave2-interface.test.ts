import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("Calendar Wave 2 interface hardening", () => {
  it("keeps the photo picker light, uniquely labelled, and explicit about supported files", () => {
    const selector = read("components/feed-planner/feed-gallery-selector.tsx")

    expect(selector.match(/id="feed-gallery-title"/g)).toHaveLength(1)
    expect(selector).toContain('accept="image/jpeg,image/png,image/webp"')
    expect(selector).toContain("aria-pressed={isSelected}")
    expect(selector).toContain("bg-[color:var(--ss-seasalt)]")
    expect(selector).not.toContain("bg-stone-950/95")
  })

  it("gives the bio editor the shared focus, Escape, and focus-restoration contract", () => {
    const view = read("components/feed-planner/instagram-feed-view.tsx")

    expect(view).toMatch(/useAccessibleModal\(\s*showBioModal/)
    expect(view).toContain("ref={bioDialogRef}")
    expect(view).toContain("ref={bioInitialFocusRef}")
  })

  it("does not pretend a blank manual grid is writing captions", () => {
    const screen = read("components/feed-planner/feed-view-screen.tsx")
    const canvas = read("components/feed-planner/calendar-empty-canvas.tsx")

    expect(screen).toContain('"Creating your blank grid"')
    expect(screen).toContain('"Maya is planning your month and drafting captions"')
    expect(canvas).not.toContain('["Planning", "Writing", "Styling"]')
  })
})
