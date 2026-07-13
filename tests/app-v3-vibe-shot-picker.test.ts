import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { AESTHETICS } from "@/components/app-v3/aesthetics"

function read(path: string) {
  return readFileSync(path, "utf8")
}

describe("Suite vibe shot picker", () => {
  it("static fallback aesthetics include selectable shots", () => {
    expect(AESTHETICS.length).toBeGreaterThan(0)
    for (const aesthetic of AESTHETICS) {
      expect(aesthetic.shots?.length, `${aesthetic.name} has no fallback shots`).toBeGreaterThan(0)
      expect(aesthetic.shots?.[0]?.image).toBeTruthy()
    }
  })

  it("aesthetics API exposes every collection shot with stripped style DNA", () => {
    const route = read("app/api/app-v3/aesthetics/route.ts")
    expect(route).toContain("const shots = collection.cards")
    expect(route).toContain("stylePrompt: stripIdentityParagraph(card.prompt)")
    expect(route).toContain("shots,")
  })

  it("Maya opens the shot picker inline instead of the Create front door owning style setup", () => {
    const frontDoor = read("components/app-v3/visual-front-door.tsx")
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const inline = read("components/app-v3/maya-inline-components.tsx")

    expect(frontDoor).not.toContain("function ShotPickerDialog")
    expect(frontDoor).not.toContain("setShotPickerAesthetic")
    expect(frontDoor).not.toContain("openAestheticShot")
    expect(frontDoor).not.toContain("compactAestheticForMaya")

    expect(concierge).toContain("setInlineShotPickerAesthetic(nextAesthetic)")
    expect(concierge).toContain("updateCurrentSession(compactInlineAestheticForMaya")
    expect(inline).toContain("export function InlineShotPicker")
    expect(inline).toContain("Choose the shot")
  })

  it("selected shots persist through local and server draft restore", () => {
    const localContinuity = read("components/app-v3/continuity.ts")
    const serverSnapshot = read("lib/app-v3/maya/draft-snapshot.ts")
    expect(localContinuity).toContain("function sanitizeAestheticShot")
    expect(localContinuity).toContain("selectedShot: sanitizeAestheticShot")
    expect(serverSnapshot).toContain("function sanitizeAestheticShot")
    expect(serverSnapshot).toContain("selectedShot: sanitizeAestheticShot")
  })

  it("Maya receives the selected shot as creative direction", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const chatRoute = read("app/api/app-v3/maya/chat/route.ts")
    const persona = read("lib/app-v3/maya/persona.ts")
    expect(concierge).toContain("selectedShot: aesthetic.selectedShot ?? null")
    expect(concierge).toContain("Shot reference: {selectedShot.title}")
    expect(chatRoute).toContain("function selectedShotContext")
    expect(chatRoute).toContain("SELECTED VAULT SHOT")
    expect(chatRoute).toContain("selectedShotGuide")
    expect(persona).toContain("selectedShotGuide")
  })
})
