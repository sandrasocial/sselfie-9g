// MAYA-COPY-PREVIEW-01 (2026-07-20) - Sandra's live ask: let the member see and edit the
// exact words about to bake onto a slide/cover, and have that EXACT edited text reach
// generation, before she spends a credit committing to it.

import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ConceptCard } from "@/components/app-v3/concept-card"
import type { ConceptCard as ConceptCardData } from "@/lib/app-v3/maya/concept-types"

const coverConcept: ConceptCardData = {
  id: "cover-1",
  title: "The Part Nobody Sees",
  description: "A clear cover for the next Reel.",
  brief: {
    outfit: "black knit",
    setting: "quiet studio",
    mood: "calm",
    pose: "looking into camera",
    cameraSpec: "Leica Q3, 28mm f/1.7",
    lighting: "soft window light",
    graphic: { headline: "Tired of this hot mess?", subline: "There is a simpler way" },
  },
}

function carouselConcept(): ConceptCardData {
  return {
    id: "concept-carousel",
    title: "The messy middle",
    description: "A seven-slide carousel.",
    brief: {
      outfit: "black knit",
      setting: "quiet studio",
      mood: "calm",
      pose: "seated",
      cameraSpec: "Leica Q3, 28mm f/1.7",
      lighting: "soft window light",
      graphic: {
        designSystem: "cutout-editorial",
        creativePlan: {
          mode: "carousel",
          userIntent: "the messy middle",
          useCase: "trust",
          audienceEmotion: "seen",
          contentGoal: "build trust",
          visualDirection: "one world",
          vaultStyleReferences: [],
          referenceHandling: { identityStrategy: "selfie_identity_anchor" },
          outputCount: 2,
          outputs: [
            {
              title: "The part nobody shows",
              body: "It's messier than the highlight reel",
              purpose: "open with honesty",
              visualConcept: "her on the bed, phone in hand",
              imagePromptDirection: "same woman on the bed with her phone, moody light",
              referenceImageStrategy: "selfie_identity_anchor",
              reasonThisMatchesUserIntent: "names the real feeling",
            },
            {
              title: "Save this for later",
              body: "",
              purpose: "invite the next step",
              visualConcept: "her walking toward the light",
              imagePromptDirection: "same woman walking toward the window light",
              referenceImageStrategy: "selfie_identity_anchor",
              reasonThisMatchesUserIntent: "invites the next step",
            },
          ],
          validationRules: [],
        } as NonNullable<ConceptCardData["brief"]["graphic"]>["creativePlan"],
      },
    },
  }
}

describe("ConceptCard: editable baked-text preview", () => {
  it("shows nothing for formats with no baked text (photo/photoshoot/video)", () => {
    const photoConcept: ConceptCardData = {
      ...coverConcept,
      brief: { ...coverConcept.brief, graphic: undefined },
    }
    render(
      <ConceptCard
        concept={photoConcept}
        format="photo"
        gen={{ status: "idle" }}
        onGenerate={vi.fn()}
      />
    )
    expect(screen.queryByLabelText("Headline")).not.toBeInTheDocument()
  })

  it("pre-fills the cover's headline/subline as editable fields before generation", () => {
    render(
      <ConceptCard
        concept={coverConcept}
        format="reel-cover"
        gen={{ status: "idle" }}
        onGenerate={vi.fn()}
      />
    )
    expect(screen.getByLabelText("Headline")).toHaveValue("Tired of this hot mess?")
    expect(screen.getByLabelText("Supporting line")).toHaveValue("There is a simpler way")
    expect(screen.getByText("The words on this cover")).toBeInTheDocument()
    // Nothing to reset until she actually changes something.
    expect(screen.queryByRole("button", { name: "Reset to Maya's words" })).not.toBeInTheDocument()
  })

  it("shows one editable row per carousel slide, labeled by position", () => {
    render(
      <ConceptCard
        concept={carouselConcept()}
        format="carousel"
        gen={{ status: "idle" }}
        onGenerate={vi.fn()}
      />
    )
    expect(screen.getByText("The words on each slide")).toBeInTheDocument()
    expect(screen.getByLabelText("Slide 1 headline")).toHaveValue("The part nobody shows")
    expect(screen.getByLabelText("Slide 2 headline")).toHaveValue("Save this for later")
  })

  it("sends her exact edited words to onGenerate, not Maya's original draft", () => {
    const onGenerate = vi.fn()
    render(
      <ConceptCard
        concept={coverConcept}
        format="reel-cover"
        gen={{ status: "idle" }}
        onGenerate={onGenerate}
      />
    )
    fireEvent.change(screen.getByLabelText("Headline"), {
      target: { value: "Her rewritten headline" },
    })
    fireEvent.click(screen.getByRole("button", { name: /Create this/ }))
    expect(onGenerate).toHaveBeenCalledWith([
      { index: 0, heading: "Her rewritten headline", body: "There is a simpler way" },
    ])
  })

  it("only offers Reset once she has actually changed something, and it restores Maya's words", () => {
    render(
      <ConceptCard
        concept={coverConcept}
        format="reel-cover"
        gen={{ status: "idle" }}
        onGenerate={vi.fn()}
      />
    )
    fireEvent.change(screen.getByLabelText("Headline"), { target: { value: "Edited" } })
    const reset = screen.getByRole("button", { name: "Reset to Maya's words" })
    fireEvent.click(reset)
    expect(screen.getByLabelText("Headline")).toHaveValue("Tired of this hot mess?")
    expect(screen.queryByRole("button", { name: "Reset to Maya's words" })).not.toBeInTheDocument()
  })

  it("hides the editable preview once the slide is already generated (the words are fixed in pixels now)", () => {
    render(
      <ConceptCard
        concept={coverConcept}
        format="reel-cover"
        gen={{ status: "done", imageUrls: ["https://example.com/result.png"] }}
        onGenerate={vi.fn()}
      />
    )
    expect(screen.queryByLabelText("Headline")).not.toBeInTheDocument()
  })

  it("carries her edited words into a regenerate ('Continue this shoot') after a result exists", () => {
    const onGenerate = vi.fn()
    const { rerender } = render(
      <ConceptCard
        concept={coverConcept}
        format="reel-cover"
        gen={{ status: "idle" }}
        onGenerate={onGenerate}
      />
    )
    fireEvent.change(screen.getByLabelText("Headline"), { target: { value: "Edited headline" } })
    fireEvent.click(screen.getByRole("button", { name: /Create this/ }))
    expect(onGenerate).toHaveBeenLastCalledWith([
      { index: 0, heading: "Edited headline", body: "There is a simpler way" },
    ])

    rerender(
      <ConceptCard
        concept={coverConcept}
        format="reel-cover"
        gen={{ status: "done", imageUrls: ["https://example.com/result.png"] }}
        onGenerate={onGenerate}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "Continue this shoot" }))
    expect(onGenerate).toHaveBeenLastCalledWith([
      { index: 0, heading: "Edited headline", body: "There is a simpler way" },
    ])
  })

  it("disables the fields while generating, matching the Create button's disabled state", () => {
    render(
      <ConceptCard
        concept={coverConcept}
        format="reel-cover"
        gen={{ status: "generating" }}
        onGenerate={vi.fn()}
      />
    )
    expect(screen.getByLabelText("Headline")).toBeDisabled()
    expect(screen.getByLabelText("Supporting line")).toBeDisabled()
  })
})

describe("maya-concierge: applies her edited copy before generating", () => {
  it("merges edited copy into the brief sent to /api/app-v3/maya/generate, and forwards it from the card", async () => {
    const { readFileSync } = await import("node:fs")
    const concierge = readFileSync("components/app-v3/maya-concierge.tsx", "utf8")
    expect(concierge).toContain("applyEditedConceptCopy")
    expect(concierge).toContain("editedCopy?: EditableConceptCopy[]")
    expect(concierge).toContain("applyEditedConceptCopy(concept.brief, editedCopy)")
    expect(concierge).toContain("brief: effectiveBrief,")
    expect(concierge).toContain("onGenerate={editedCopy =>")
  })
})
