import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

function read(path: string) {
  return readFileSync(path, "utf8")
}

describe("Maya first-user clarity", () => {
  it("starts with three clear creation paths instead of a feature list", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(concierge).toContain('label: "AI Photos"')
    expect(concierge).toContain('description: "Photos & photoshoots"')
    expect(concierge).toContain('label: "Edit a Photo"')
    expect(concierge).toContain('description: "Editing & presets"')
    expect(concierge).toContain('label: "Build a Post"')
    expect(concierge).toContain('description: "Carousels, captions & stories"')
    expect(concierge).toContain("Choose one selfie to start with.")
    expect(concierge).not.toContain("Included in SSELFIE SUITE")
  })

  it("makes the empty selfie area the single obvious upload action", () => {
    const manager = read("components/app-v3/selfie-reference-manager-modal.tsx")

    expect(manager).toContain("Selected selfie")
    expect(manager).toContain("onClick={() => faceInputRef.current?.click()}")
    expect(manager).toContain("Upload your selfie")
    expect(manager).toContain("Choose a clear photo from your phone")
    expect(manager).toContain('faceUrl ? "Continue with Maya" : "Upload a selfie to continue"')
    expect(manager).not.toContain("Main selfie")
  })

  it("states what Maya is doing instead of referring to an unclear Create action", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const conceptCard = read("components/app-v3/concept-card.tsx")

    expect(concierge).toContain("Choose a direction. Maya will create it with your real face.")
    expect(concierge).not.toContain(
      "Your selfie's in, and it's still you. Hit create and pick the idea that feels most like you."
    )
    expect(concierge).not.toContain("Start here\n")
    expect(conceptCard).toContain("Maya is creating your photo…")
  })

  it("preserves the already-simple result and fullscreen return contracts", () => {
    const resultActions = read("components/app-v3/maya-inline-components.tsx")
    const lightbox = read("components/app-v3/image-lightbox.tsx")

    expect(resultActions).toContain("Make it more like me")
    expect(resultActions).toContain("Tell Maya what feels off")
    expect(resultActions).not.toContain("Photos")
    expect(resultActions).not.toContain("Slides")
    expect(resultActions).not.toContain("Motion")
    expect(resultActions).not.toContain("Maya recommends next")
    expect(resultActions).not.toContain("More things Maya can make")
    expect(lightbox).toContain('aria-label="Your finished creation"')
    expect(lightbox).toContain("onClose")
  })
})
