import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

function read(path: string) {
  return readFileSync(path, "utf8")
}

function sourceBetween(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex)

  expect(startIndex).toBeGreaterThanOrEqual(0)
  expect(endIndex).toBeGreaterThan(startIndex)

  return source.slice(startIndex, endIndex)
}

describe("App v3 curated creation handoffs", () => {
  it("lets Maya carry a Calendar idea and its hook into creation without asking for a style", () => {
    const shell = read("components/app-v3/app-v3-shell.tsx")
    const createIdea = sourceBetween(shell, "function createIdea", "function createMotionFromImage")

    expect(createIdea).toContain("openWithAesthetic(MAYA_DECIDES_AESTHETIC")
    expect(createIdea).toContain("creationIdea: title")
    expect(createIdea).not.toContain("openWithAesthetic(MAYA_GENERAL")
  })

  it("keeps Gallery Move on the selected-image video route and bypasses style selection", () => {
    const shell = read("components/app-v3/app-v3-shell.tsx")
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const createMotion = sourceBetween(
      shell,
      "function createMotionFromImage",
      "function createWithTrainedModel"
    )
    const vibeGate = sourceBetween(
      concierge,
      "const shouldShowVibeChoice",
      "const customModelAvailable"
    )

    expect(createMotion).toContain('format: "video"')
    expect(createMotion).toContain("videoSourceUrl: imageUrl")
    expect(createMotion).toContain('intentForFormat("video", "gallery_action")')
    expect(vibeGate).toContain('outputFormat !== "video"')
  })
})
