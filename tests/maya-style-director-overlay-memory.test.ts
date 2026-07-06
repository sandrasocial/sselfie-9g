// @vitest-environment node

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8")
}

describe("Maya style director mode", () => {
  it("pauses after a Vault shot pick and asks what kind of shoot she wants", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const inline = read("components/app-v3/maya-inline-components.tsx")
    const types = read("components/app-v3/types.ts")
    const chatRoute = read("app/api/app-v3/maya/chat/route.ts")

    expect(inline).toContain("InlineShotDirectorCard")
    expect(inline).toContain("Recreate this shot")
    expect(inline).toContain("More angles of this look")
    expect(inline).toContain("Full shoot")
    expect(inline).toContain("const counts: Array<6 | 8 | 9> = [6, 8, 9]")
    expect(inline).toContain("{count} shots · {count} credits")

    const shotPickBody = concierge.slice(
      concierge.indexOf("function handleInlineShotPick"),
      concierge.indexOf("function handleShotDirectorChoice")
    )

    expect(concierge).toContain("pendingShotDirector")
    expect(concierge).toContain("handleShotDirectorChoice")
    expect(concierge).toContain("shotDirector")
    expect(shotPickBody).toContain("setPendingShotDirector")
    expect(shotPickBody).not.toContain("openWithAesthetic")

    expect(types).toContain("export interface ShotDirectorIntent")
    expect(types).toContain("requestedShotCount: 6 | 8 | 9")
    expect(chatRoute).toContain("normalizeShotDirector")
    expect(chatRoute).toContain("MAYA DIRECTOR MODE")
    expect(chatRoute).toContain("exactly ${shotDirector.requestedShotCount} cohesive photoshoot briefs")
  })
})

describe("Maya overlay style memory", () => {
  it("stores the remembered overlay style structurally and uses it before generic style picking", () => {
    const migration = read("db/migrations/64-add-app-v3-preferred-overlay-style.sql")
    const memoryStore = read("lib/app-v3/maya/memory-store.ts")
    const memoryApi = read("app/api/app-v3/maya/memory/route.ts")
    const textOverlay = read("lib/app-v3/text-overlay.ts")
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(migration).toContain("preferred_overlay_style")
    expect(memoryStore).toContain("preferredOverlayStyle")
    expect(memoryStore).toContain("preferred_overlay_style")
    expect(memoryApi).toContain("preferredOverlayStyle")

    expect(textOverlay).toContain("rememberedOverlayStyle")
    expect(textOverlay).toMatch(/rememberedOverlayStyle[\s\S]{0,450}return rememberedPreset\.id/)

    expect(concierge).toContain("rememberedOverlayStyle")
    expect(concierge).toContain("savePreferredOverlayStyle")
    expect(concierge).toContain("Use your usual style")
    expect(concierge).toContain("styleAdjustments")
  })
})
