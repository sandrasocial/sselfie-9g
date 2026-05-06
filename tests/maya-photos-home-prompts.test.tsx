import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import MayaPhotosHome from "@/components/sselfie/maya/maya-photos-home"

function renderPhotosHome(input: { hasTrainedModel: boolean; proMode: boolean; onSendPrompt?: (prompt: string) => void }) {
  const onSendPrompt = input.onSendPrompt || vi.fn()

  render(
    <MayaPhotosHome
      creditsReady={10}
      hasTrainedModel={input.hasTrainedModel}
      proMode={input.proMode}
      onSendPrompt={onSendPrompt}
      onOpenUpload={vi.fn()}
      onTrainModel={vi.fn()}
      onOpenPlan={vi.fn()}
    />,
  )

  return { onSendPrompt }
}

describe("MayaPhotosHome prompts", () => {
  it("uses selfie prompts when Selfie mode is active even if My Model exists", () => {
    const { onSendPrompt } = renderPhotosHome({ hasTrainedModel: true, proMode: true })

    fireEvent.click(screen.getByRole("button", { name: "Create Concept Cards" }))

    expect(onSendPrompt).toHaveBeenCalledWith(
      "Use my selfies and create three strong photo concepts for my personal brand.",
    )
    expect(onSendPrompt).not.toHaveBeenCalledWith(
      expect.stringContaining("Use my trained model"),
    )
  })

  it("uses trained-model prompts only when My Model mode is active and available", () => {
    const { onSendPrompt } = renderPhotosHome({ hasTrainedModel: true, proMode: false })

    fireEvent.click(screen.getByRole("button", { name: "Soft Luxury Photo" }))

    expect(onSendPrompt).toHaveBeenCalledWith(
      "Use my trained model and create a soft luxury photo for my brand.",
    )
  })
})
