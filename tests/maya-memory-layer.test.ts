import { describe, expect, it } from "vitest"

import { detectMayaRememberIntent, mergePreferenceNotes } from "@/lib/maya/memory-layer"

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
