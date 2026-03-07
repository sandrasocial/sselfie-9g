import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import MayaPromptsTab from "@/components/sselfie/maya/maya-prompts-tab"

describe("MayaPromptsTab API action handling", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock)
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(() => null),
      length: 0,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it("opens training flow when API reports training_required", async () => {
    const onOpenTrainingFlow = vi.fn()

    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes("/api/prompt-guides/items")) {
        return {
          ok: true,
          json: async () => ({
            items: [
              { id: 1, concept_title: "Prompt 1", prompt_text: "Editorial portrait", image_url: null, category: "portrait" },
            ],
            categories: ["portrait"],
          }),
        }
      }
      if (url.includes("/api/maya/generate-image")) {
        return {
          ok: false,
          status: 409,
          json: async () => ({
            error: "No trained model found. Please complete training first.",
            code: "training_required",
            action: "open_training_upload",
            message: "Train your model to use Custom Model mode.",
          }),
        }
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    render(
      <MayaPromptsTab
        onSelectPrompt={vi.fn()}
        sharedImages={[]}
        proMode={false}
        onOpenTrainingFlow={onOpenTrainingFlow}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText("Prompt 1")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /generate/i }))

    await waitFor(() => {
      expect(onOpenTrainingFlow).toHaveBeenCalledTimes(1)
    })
  })

  it("opens credits modal when API returns 402", async () => {
    const onOpenCreditsModal = vi.fn()

    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes("/api/prompt-guides/items")) {
        return {
          ok: true,
          json: async () => ({
            items: [
              { id: 1, concept_title: "Prompt 1", prompt_text: "Editorial portrait", image_url: null, category: "portrait" },
            ],
            categories: ["portrait"],
          }),
        }
      }
      if (url.includes("/api/maya/generate-image")) {
        return {
          ok: false,
          status: 402,
          json: async () => ({
            error: "Insufficient credits",
            code: "insufficient_credits",
            action: "open_credits_topup",
            message: "Image generation requires 1 credit.",
          }),
        }
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    render(
      <MayaPromptsTab
        onSelectPrompt={vi.fn()}
        sharedImages={[]}
        proMode={false}
        onOpenCreditsModal={onOpenCreditsModal}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText("Prompt 1")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /generate/i }))

    await waitFor(() => {
      expect(onOpenCreditsModal).toHaveBeenCalledTimes(1)
    })
  })
})
