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
})
