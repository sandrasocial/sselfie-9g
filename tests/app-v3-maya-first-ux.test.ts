import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

function read(path: string) {
  return readFileSync(path, "utf8")
}

describe("Maya-first Suite creation UX", () => {
  it("makes the Create page start with Maya instead of a format grid", () => {
    const frontDoor = read("components/app-v3/visual-front-door.tsx")

    expect(frontDoor).toContain("What do you want to make today?")
    expect(frontDoor).toContain("STARTER_CHIPS")
    expect(frontDoor).toContain("Make my first photo")
    expect(frontDoor).toContain("Turn an idea into a carousel")
    expect(frontDoor).toContain("Choose manually")
    expect(frontDoor).toContain("manualOpen")
    expect(frontDoor).toContain("detectCreationIntent")
    expect(frontDoor).toContain("creationIntent: intent")
  })

  it("routes clear typed requests before Maya replies", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(concierge).toContain("commitDetectedIntent(text)")
    expect(concierge).toContain("extrasRef.current = { ...extrasRef.current, format: intent.format")
    expect(concierge).toContain("creationIntent: activeCreationIntent")
    expect(concierge).toContain("InlineFormatChoice")
    expect(concierge).toContain("InlineSelfieUpload")
    expect(concierge).toContain("InlineVibePicker")
    expect(concierge).toContain("InlineShotPicker")
    expect(concierge).toContain("InlineResultActions")
    expect(concierge).toContain("onPick={sendInlineAnswer}")
  })

  it("keeps the server from defaulting unclear requests into photo concepts", () => {
    const route = read("app/api/app-v3/maya/chat/route.ts")

    expect(route).toContain("normalizeCreationIntent")
    expect(route).toContain("needsFormatClarification")
    expect(route).toContain("No output format has been committed yet")
    expect(route).toContain("Do not assume this is a photo request")
    expect(route).toContain("Do not call emit_concepts until she chooses")
  })

  it("stores creation intent in local and server draft snapshots", () => {
    const localContinuity = read("components/app-v3/continuity.ts")
    const serverSnapshot = read("lib/app-v3/maya/draft-snapshot.ts")

    expect(localContinuity).toContain("function sanitizeCreationIntent")
    expect(localContinuity).toContain("creationIntent: sanitizeCreationIntent")
    expect(serverSnapshot).toContain("function sanitizeCreationIntent")
    expect(serverSnapshot).toContain("creationIntent: sanitizeCreationIntent")
  })

  it("routes existing Content and Gallery entry points into Maya with source context", () => {
    const shell = read("components/app-v3/app-v3-shell.tsx")

    expect(shell).toContain("intentForFormat(format, \"content_card\")")
    expect(shell).toContain("intentForFormat(\"video\", \"gallery_action\")")
    expect(shell).toContain("creationIntent: intentForFormat(format, \"manual\")")
  })
})
