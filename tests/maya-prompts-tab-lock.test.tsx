import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import MayaPromptsTab from "@/components/sselfie/maya/maya-prompts-tab"

describe("MayaPromptsTab lock state", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          { id: 1, concept_title: "Prompt 1", prompt_text: "Editorial cafe look", image_url: null, category: "lifestyle" },
          { id: 2, concept_title: "Prompt 2", prompt_text: "Professional headshot", image_url: null, category: "business" },
          { id: 3, concept_title: "Prompt 3", prompt_text: "Warm outdoor portrait", image_url: null, category: "portrait" },
          { id: 4, concept_title: "Prompt 4", prompt_text: "Night city walk", image_url: null, category: "street" },
        ],
        categories: ["lifestyle", "business", "portrait", "street"],
      }),
    })
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

  it("shows locked banner, preview cards, and upgrade CTA", async () => {
    const onUpgradeToStudio = vi.fn()

    render(
      <MayaPromptsTab
        onSelectPrompt={vi.fn()}
        sharedImages={[]}
        proMode
        imageLibrary={{ selfies: [], products: [], people: [], vibes: [], intent: "" }}
        aiPhotoPromptsLocked
        onUpgradeToStudio={onUpgradeToStudio}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText("Unlock 100+ Curated Prompts")).toBeInTheDocument()
    })

    expect(screen.getAllByText("Preview")).toHaveLength(3)
    expect(screen.getByText("Editorial cafe look")).toBeInTheDocument()
    expect(screen.getByText("Professional headshot")).toBeInTheDocument()
    expect(screen.getByText("Warm outdoor portrait")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /upgrade to studio/i }))
    expect(onUpgradeToStudio).toHaveBeenCalledTimes(1)
  })
})
