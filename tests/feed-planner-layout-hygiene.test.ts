// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

describe("feed planner layout hygiene", () => {
  it("keeps feed tabs visually lightweight", () => {
    const tabs = read("components/feed-planner/feed-tabs.tsx")
    expect(tabs).toContain("min-h-11 shrink-0")
    expect(tabs).toContain("tracking-[0.14em]")
    expect(tabs).not.toContain("rounded-full border border-white/15 bg-white/[0.04] p-1")
  })

  it("removes non-functional menu chrome from feed header top row", () => {
    const header = read("components/feed-planner/feed-header.tsx")
    expect(header).not.toContain("Menu</button>")
  })

  it("uses compact but touch-safe action chips in the feed header", () => {
    const header = read("components/feed-planner/feed-header.tsx")
    expect(header).toContain("min-h-11")
    expect(header).not.toContain("min-h-[34px]")
    expect(header).not.toContain("stone-chip rounded-full px-3 py-1.5")
    expect(header).not.toContain("rounded-full border border-white/15 bg-white/[0.05]")
  })
})
