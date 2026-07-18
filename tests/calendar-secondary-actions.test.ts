import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const source = fs.readFileSync(
  path.join(process.cwd(), "components/feed-planner/instagram-feed-view.tsx"),
  "utf8",
)
const highlightsSource = fs.readFileSync(
  path.join(process.cwd(), "components/feed-planner/feed-highlights-modal.tsx"),
  "utf8",
)

describe("Calendar secondary action trust", () => {
  it("opens the bio editor without generating until the user confirms", () => {
    const openHandler = source.match(/const handleOpenBio = \(\) => \{([\s\S]*?)\n  \}/)?.[1] ?? ""

    expect(openHandler).toContain("setShowBioModal(true)")
    expect(openHandler).not.toContain("fetch(")
    expect(source).toContain("onWriteBio={handleOpenBio}")
    expect(source).toContain("onClick={handleGenerateBio}")
    expect(source).toContain("Generate with Maya")
  })

  it("does not erase the current bio while a replacement is generating", () => {
    const generateHandler = source.match(
      /const handleGenerateBio = async \(\) => \{([\s\S]*?)\n  \}\n\n  const handleSaveBio/,
    )?.[1] ?? ""

    expect(generateHandler).toContain("/generate-bio")
    expect(generateHandler).not.toContain('setBioText("")')
  })

  it("exposes Highlights as a labelled modal that closes with Escape", () => {
    expect(highlightsSource).toContain('role="dialog"')
    expect(highlightsSource).toContain('aria-modal="true"')
    expect(highlightsSource).toContain('aria-labelledby="story-studio-title"')
    expect(highlightsSource).toContain('id="story-studio-title"')
    expect(highlightsSource).toContain('event.key === "Escape"')
  })
})
