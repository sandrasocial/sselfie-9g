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
    expect(tabs).toContain("min-h-[34px] sm:min-h-[36px]")
    expect(tabs).toContain("tracking-[0.16em]")
    expect(tabs).not.toContain("rounded-full border border-white/15 bg-white/[0.04] p-1")
  })

  it("removes non-functional menu chrome from feed header top row", () => {
    const header = read("components/feed-planner/feed-header.tsx")
    expect(header).not.toContain("Menu</button>")
  })

  it("uses compact action chips in feed header instead of large heavy buttons", () => {
    const header = read("components/feed-planner/feed-header.tsx")
    expect(header).toContain("min-h-[34px] sm:min-h-[36px]")
    expect(header).toContain("rounded-full border border-white/15 bg-white/[0.05]")
  })
})
