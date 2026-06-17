// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8")
}

describe("App v3 shell overflow containment", () => {
  it("locks the /app root to the visual viewport on mobile without disabling pinch zoom", () => {
    const layout = read("app/app/layout.tsx")

    expect(layout).toContain("html:has(.studio-3-root)")
    expect(layout).toContain("body:has(.studio-3-root)")
    expect(layout).toContain("overflow-x: clip")
    expect(layout).toContain("overscroll-behavior-x: none")
    expect(layout).toContain("touch-action: pan-y pinch-zoom")
    expect(layout).toContain("max-width: 100vw")
  })

  it("keeps app inputs at 16px on mobile so iOS Safari does not auto-zoom and create sideways panning", () => {
    const layout = read("app/app/layout.tsx")

    expect(layout).toContain("@media (max-width: 767px)")
    expect(layout).toContain(".studio-3-root input")
    expect(layout).toContain(".studio-3-root textarea")
    expect(layout).toContain(".studio-3-root select")
    expect(layout).toContain("font-size: 16px !important")
  })

  it("keeps the live app shell and Maya drawer from creating sideways pan", () => {
    const shell = read("components/app-v3/app-v3-shell.tsx")
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(shell).toContain("max-w-[100dvw]")
    expect(shell).toContain("[overflow-x:clip]")
    expect(shell).toContain("overscroll-x-none")

    expect(concierge).toContain("max-w-[100dvw]")
    expect(concierge).toContain("[overflow-x:clip]")
    expect(concierge).toContain("overscroll-x-none")
    expect(concierge).toContain("sm:slide-in-from-right")
    expect(concierge).not.toContain(" animate-in slide-in-from-right")
  })

  it("contains the Maya chat thread, bubbles, cards, and composer inside the phone viewport", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const inlineCard = read("components/app-v3/inline-card.tsx")
    const conceptCard = read("components/app-v3/concept-card.tsx")

    expect(concierge).toContain("min-w-0")
    expect(concierge).toContain("max-w-full")
    expect(concierge).toContain("[overflow-wrap:anywhere]")
    expect(concierge).toContain("break-words")
    expect(concierge).toContain("overflow-y-auto")
    expect(concierge).toContain("[overflow-x:clip]")

    expect(inlineCard).toContain("min-w-0")
    expect(inlineCard).toContain("max-w-full")
    expect(inlineCard).toContain("[overflow-x:clip]")

    expect(conceptCard).toContain("min-w-0")
    expect(conceptCard).toContain("max-w-full")
    expect(conceptCard).toContain("[overflow-x:clip]")
  })
})
