import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

function read(path: string) {
  return readFileSync(path, "utf8")
}

describe("Maya first-user clarity", () => {
  it("explains the first finished outcome without leading with a feature list", () => {
    const frontDoor = read("components/app-v3/visual-front-door.tsx")

    expect(frontDoor).toContain("Your first brand photo starts here.")
    expect(frontDoor).toContain("Maya keeps your real face")
    expect(frontDoor).toContain("one brand photo you can use today")
    expect(frontDoor).toContain('eyebrow="SSELFIE SUITE"')
    expect(frontDoor).toContain("Start with one clear selfie.")
    expect(frontDoor).not.toContain("Included in SSELFIE SUITE")
    expect(frontDoor).not.toContain('eyebrow: "Fastest path"')
  })

  it("makes the empty selfie area the single obvious upload action", () => {
    const manager = read("components/app-v3/selfie-reference-manager-modal.tsx")

    expect(manager).toContain("Selected selfie")
    expect(manager).toContain('onClick={() => faceInputRef.current?.click()}')
    expect(manager).toContain("Upload your selfie")
    expect(manager).toContain("Choose a clear photo from your phone")
    expect(manager).toContain('faceUrl ? "Continue with Maya" : "Upload a selfie to continue"')
    expect(manager).not.toContain("Main selfie")
  })

  it("states what Maya is doing instead of referring to an unclear Create action", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const conceptCard = read("components/app-v3/concept-card.tsx")

    expect(concierge).toContain("I chose a clear starting direction below")
    expect(concierge).not.toContain(
      "Your selfie's in, and it's still you. Hit create and pick the idea that feels most like you."
    )
    expect(concierge).not.toContain("Start here\n")
    expect(conceptCard).toContain("Maya is creating your photo…")
  })

  it("preserves the already-simple result and fullscreen return contracts", () => {
    const resultActions = read("components/app-v3/maya-inline-components.tsx")
    const lightbox = read("components/app-v3/image-lightbox.tsx")

    expect(resultActions).toContain("Maya recommends next")
    expect(resultActions).toContain("More things Maya can make")
    expect(lightbox).toContain('aria-label="Your finished creation"')
    expect(lightbox).toContain("onClose")
  })
})
