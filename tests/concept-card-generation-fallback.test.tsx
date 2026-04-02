import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import ConceptCard from "@/components/sselfie/concept-card"

vi.mock("@/components/sselfie/instagram-photo-card", () => ({
  default: () => null,
}))

vi.mock("@/components/sselfie/instagram-reel-card", () => ({
  default: () => null,
}))

vi.mock("@/components/sselfie/instagram-carousel-card", () => ({
  default: () => null,
}))

vi.mock("@/components/sselfie/image-gallery-modal", () => ({
  default: () => null,
}))

vi.mock("@/components/sselfie/pro-photoshoot-panel", () => ({
  default: () => null,
}))

vi.mock("@/components/sselfie/buy-credits-modal", () => ({
  default: () => null,
}))

describe("ConceptCard generation routing", () => {
  const fetchMock = vi.fn()
  const localStorageMock = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  }

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock)
    vi.stubGlobal("localStorage", localStorageMock)
    localStorageMock.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it("falls back to selfie generation when a trained model is unavailable but selfies exist", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes("/api/maya/generate-studio-pro")) {
        return {
          ok: true,
          text: async () => JSON.stringify({ predictionId: "pred_123" }),
        }
      }

      if (url.includes("/api/maya/check-studio-pro")) {
        return {
          ok: true,
          json: async () => ({
            status: "succeeded",
            output: "https://example.com/generated.png",
          }),
        }
      }

      throw new Error(`Unexpected fetch: ${url}`)
    })

    render(
      <ConceptCard
        concept={{
          id: "concept-1",
          title: "Editorial portrait",
          description: "Soft natural light",
          prompt: "Create an editorial portrait with soft natural light",
          category: "portrait",
        } as any}
        studioProMode={false}
        userHasTrainedModel={false}
        baseImages={["https://example.com/selfie-1.jpg"]}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: /create photo/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/maya/generate-studio-pro",
        expect.objectContaining({ method: "POST" }),
      )
    })
  })

  it("keeps using the classic generation route when a trained model is available", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes("/api/maya/generate-image")) {
        return {
          ok: true,
          json: async () => ({
            predictionId: "pred_classic",
            generationId: 42,
            userId: "user-1",
          }),
        }
      }

      throw new Error(`Unexpected fetch: ${url}`)
    })

    render(
      <ConceptCard
        concept={{
          id: "concept-2",
          title: "Brand portrait",
          description: "Studio portrait",
          prompt: "Create a polished studio brand portrait",
          category: "portrait",
        } as any}
        studioProMode={false}
        userHasTrainedModel={true}
        baseImages={["https://example.com/selfie-1.jpg"]}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: /create photo/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/maya/generate-image",
        expect.objectContaining({ method: "POST" }),
      )
    })
  })
})
