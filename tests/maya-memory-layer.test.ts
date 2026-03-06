import { describe, expect, it } from "vitest"

import {
  detectMayaRememberIntent,
  mergePreferenceNotes,
  detectMayaAssetEditIntent,
  detectMayaAssetCreateIntent,
} from "@/lib/maya/memory-layer"

describe("detectMayaRememberIntent", () => {
  it("extracts explicit remember commands", () => {
    const intent = detectMayaRememberIntent("Remember I hate blue tones in my photos")
    expect(intent).toEqual({
      note: "I hate blue tones in my photos",
      source: "remember_command",
    })
  })

  it("captures style feedback phrases as memory notes", () => {
    const intent = detectMayaRememberIntent("This doesn't sound like me. From now on keep it more minimal.")
    expect(intent).toEqual({
      note: "This doesn't sound like me. From now on keep it more minimal.",
      source: "style_feedback",
    })
  })

  it("ignores normal conversation that is not a memory update", () => {
    const intent = detectMayaRememberIntent("Can you make a chic editorial photo?")
    expect(intent).toBeNull()
  })
})

describe("mergePreferenceNotes", () => {
  it("prepends new notes and deduplicates by normalized text", () => {
    const merged = mergePreferenceNotes(["No blue tones", "Warm neutrals only"], "no BLUE tones")
    expect(merged).toEqual(["no BLUE tones", "Warm neutrals only"])
  })

  it("keeps max note count cap", () => {
    const existing = Array.from({ length: 25 }, (_, index) => `note ${index + 1}`)
    const merged = mergePreferenceNotes(existing, "new note")
    expect(merged.length).toBe(20)
    expect(merged[0]).toBe("new note")
  })
})

describe("detectMayaAssetEditIntent", () => {
  it("detects explicit landing page edit requests", () => {
    const intent = detectMayaAssetEditIntent("Update my landing page headline to Book More Clients", null)
    expect(intent).toEqual({
      assetType: "page",
      assetLabel: "Landing Page",
      instruction: "Update my landing page headline to Book More Clients",
      mode: "start",
    })
  })

  it("continues edits on active context when asset is implied", () => {
    const intent = detectMayaAssetEditIntent("Change the CTA to Start Today", {
      assetType: "calendar",
      assetLabel: "Content Calendar",
      updatedAt: new Date().toISOString(),
    })

    expect(intent).toEqual({
      assetType: "calendar",
      assetLabel: "Content Calendar",
      instruction: "Change the CTA to Start Today",
      mode: "continue",
    })
  })

  it("does not hijack image editing requests", () => {
    const intent = detectMayaAssetEditIntent("Edit this photo to be brighter", {
      assetType: "page",
      assetLabel: "Landing Page",
      updatedAt: new Date().toISOString(),
    })
    expect(intent).toBeNull()
  })

  it("does not treat generic pronouns as an asset edit continuation", () => {
    const intent = detectMayaAssetEditIntent("Can you help me with this?", {
      assetType: "page",
      assetLabel: "Landing Page",
      updatedAt: new Date().toISOString(),
    })
    expect(intent).toBeNull()
  })
})

describe("detectMayaAssetCreateIntent", () => {
  it("detects creation requests for non-image assets", () => {
    const intent = detectMayaAssetCreateIntent("Create a landing page for my new offer")
    expect(intent).toEqual({
      assetType: "page",
      instruction: "Create a landing page for my new offer",
    })
  })

  it("does not catch photo generation prompts", () => {
    const intent = detectMayaAssetCreateIntent("Create a photo with urban style")
    expect(intent).toBeNull()
  })

  it("detects natural language create intent without strict create verb", () => {
    const intent = detectMayaAssetCreateIntent("I need a landing page for my studio offer")
    expect(intent).toEqual({
      assetType: "page",
      instruction: "I need a landing page for my studio offer",
    })
  })
})
