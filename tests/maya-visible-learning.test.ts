// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  buildLikenessAcknowledgement,
  decideLikenessCapture,
} from "@/lib/app-v3/maya/likeness-capture-ux"
import type { LikenessClassification } from "@/lib/app-v3/likeness-memory"

const read = (path: string) => readFileSync(path, "utf8")

const specific: LikenessClassification = {
  isLikeness: true,
  isVanity: false,
  note: "hair: my hair is dark brown not black",
  category: "hair",
}

describe("Maya visible likeness learning", () => {
  it("acknowledges a specific captured correction in Maya's voice", () => {
    expect(decideLikenessCapture(specific)).toBe("capture")
    const copy = buildLikenessAcknowledgement(specific.note!)
    expect(copy).toBe(
      "Noted. Your hair is dark brown, not black. I’ll keep that true in every photo from now on."
    )
    expect(copy).not.toContain("—")
  })

  it("offers before storing a vague, low-confidence likeness complaint", () => {
    const vagueNote = "likeness: this doesn't look like me"
    expect(
      decideLikenessCapture({
        isLikeness: true,
        isVanity: false,
        note: vagueNote,
        category: "likeness",
      })
    ).toBe("offer")
    expect(buildLikenessAcknowledgement(vagueNote)).toBe(
      "Noted. I’ll use that feedback to keep every future photo true to you."
    )
  })

  it("never offers or captures a vanity request", () => {
    expect(
      decideLikenessCapture({
        isLikeness: false,
        isVanity: true,
        note: null,
        category: null,
      })
    ).toBe("ignore")
  })

  it("wires acknowledgement, one-tap offer, deletion, and analytics through the live surfaces", () => {
    const editRoute = read("app/api/app-v3/maya/edit/route.ts")
    const editMode = read("components/app-v3/edit-mode.tsx")
    const memoryRoute = read("app/api/app-v3/maya/memory/route.ts")
    const memoryModal = read("components/app-v3/memory-modal.tsx")
    const contract = read("lib/analytics/event-contract.ts")

    expect(editRoute).toContain("likenessMemory")
    expect(editMode).toContain("Want me to remember that for every future photo?")
    expect(editMode).toContain("suite_likeness_offer_shown")
    expect(editMode).toContain("suite_likeness_offer_dismissed")
    expect(memoryRoute).toContain("addLikenessNote")
    expect(memoryRoute).toContain("suite_likeness_offer_accepted")
    expect(memoryRoute).toContain("suite_likeness_note_deleted")
    expect(memoryModal).toContain("What I know about you")
    expect(memoryModal).toContain("preferredFeedStyle")
    for (const event of [
      "suite_likeness_offer_shown",
      "suite_likeness_offer_accepted",
      "suite_likeness_offer_dismissed",
      "suite_likeness_note_deleted",
    ]) {
      expect(contract).toContain(`\"${event}\"`)
    }
  })
})
