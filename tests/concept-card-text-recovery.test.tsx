import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ConceptCard } from "@/components/app-v3/concept-card"

const concept = {
  id: "cover-1",
  title: "The Part Nobody Sees",
  description: "A clear cover for the next Reel.",
  brief: {
    outfit: "black knit",
    setting: "quiet studio",
    mood: "calm",
    pose: "looking into camera",
  },
}

describe("ConceptCard missing text recovery", () => {
  it("lets the member retry a missing baked-text result from the card", async () => {
    const onRetryText = vi.fn(async () => {})

    render(
      <ConceptCard
        concept={concept}
        format="reel-cover"
        gen={{
          status: "done",
          imageUrls: ["https://example.com/clean.png"],
          textOverlayMode: "with-text",
          textOverlaySpecs: [
            {
              headline: "The Part Nobody Sees",
              position: "top",
              style: "editorial-serif-center",
              format: "reel-cover",
            },
          ],
        }}
        onGenerate={vi.fn()}
        onRetryText={onRetryText}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Try text again" }))

    await waitFor(() => expect(onRetryText).toHaveBeenCalledTimes(1))
  })
})
