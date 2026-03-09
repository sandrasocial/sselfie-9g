import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { extractImageMarker, parseSelfieGuideChapters } from "@/lib/selfie-guide/experience"

describe("selfie guide experience parser", () => {
  it("splits markdown into chapter chunks by h2 headings", () => {
    const markdown = [
      "# Guide",
      "Opening context",
      "## PART 1: Lighting",
      "Tips one",
      "## PART 2: Angles",
      "Tips two",
    ].join("\n")

    const chapters = parseSelfieGuideChapters(markdown)

    expect(chapters.length).toBe(3)
    expect(chapters[0].title).toBe("Start Here")
    expect(chapters[1].title).toContain("PART 1")
    expect(chapters[2].title).toContain("PART 2")
  })

  it("extracts image marker tokens from inline markdown notes", () => {
    expect(extractImageMarker("[IMAGE: iphone-settings-mockup.png — alt text]")).toBe("iphone-settings-mockup.png")
    expect(extractImageMarker("*[IMAGE: feed-post-1.png — before/after]*")).toBe("feed-post-1.png")
    expect(extractImageMarker("no marker")).toBeNull()
  })

  it("does not reuse the same guide image asset multiple times in the experience component", () => {
    const component = readFileSync("components/freebie/selfie-guide-experience.tsx", "utf8")
    const matches = [...component.matchAll(/src:\s*"\/images\/selfie-guide\/([^"]+)"/g)].map(match => match[1])
    const counts = new Map<string, number>()

    for (const match of matches) {
      counts.set(match, (counts.get(match) || 0) + 1)
    }

    const duplicates = [...counts.entries()].filter(([, count]) => count > 1)
    expect(duplicates).toEqual([])
  })
})
