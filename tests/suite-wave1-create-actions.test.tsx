// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { VisualFrontDoor } from "@/components/app-v3/visual-front-door"

const mocks = vi.hoisted(() => ({
  openFresh: vi.fn(),
  openHistory: vi.fn(),
  openWithAesthetic: vi.fn(),
  openFavorites: vi.fn(),
  trackAnalyticsEvent: vi.fn(),
  workspaceBusy: false,
}))

vi.mock("next/image", () => ({
  default: ({ fill: _fill, priority: _priority, alt, ...props }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={typeof alt === "string" ? alt : ""} {...props} />
  ),
}))

vi.mock("@/components/app-v3/concierge-context", () => ({
  useConcierge: () => ({
    openFresh: mocks.openFresh,
    openHistory: mocks.openHistory,
    openWithAesthetic: mocks.openWithAesthetic,
    workspaceBusy: mocks.workspaceBusy,
  }),
}))

vi.mock("@/components/app-v3/use-identity-references", () => ({
  useIdentityReferences: () => ({
    hasSelfie: true,
    loading: false,
    primarySelfieUrl: "https://example.com/member-selfie.jpg",
    referenceCount: 1,
  }),
}))

vi.mock("@/components/app-v3/memory-modal", () => ({
  MemoryModal: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div role="dialog" aria-label="What Maya remembers">
        <button type="button" onClick={onClose}>
          Close memory
        </button>
      </div>
    ) : null,
}))

vi.mock("@/lib/analytics/client", () => ({
  trackAnalyticsEvent: mocks.trackAnalyticsEvent,
}))

const aesthetics = [
  {
    id: "look-one",
    name: "Look one",
    blurb: "First look",
    coverImage: "https://example.com/look-one.jpg",
    thumbnails: [],
    shotCount: 3,
    intent: "Look one",
  },
  {
    id: "look-two",
    name: "Look two",
    blurb: "Second look",
    coverImage: "https://example.com/look-two.jpg",
    thumbnails: [],
    shotCount: 3,
    intent: "Look two",
  },
  {
    id: "look-three",
    name: "Look three",
    blurb: "Third look",
    coverImage: "https://example.com/look-three.jpg",
    thumbnails: [],
    shotCount: 3,
    intent: "Look three",
  },
]

function renderCreate() {
  return render(
    <VisualFrontDoor
      hasSelfie
      {...({ onOpenFavorites: mocks.openFavorites } as Record<string, unknown>)}
    />
  )
}

describe("Wave 1 Create actions", () => {
  beforeEach(() => {
    mocks.openFresh.mockReset()
    mocks.openHistory.mockReset()
    mocks.openWithAesthetic.mockReset()
    mocks.openFavorites.mockReset()
    mocks.trackAnalyticsEvent.mockReset()
    mocks.trackAnalyticsEvent.mockResolvedValue(undefined)
    mocks.workspaceBusy = false
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
    })

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url === "/api/app-v3/aesthetics") {
          return { ok: true, json: async () => ({ aesthetics }) } as Response
        }
        if (url === "/api/app-v3/gallery") {
          return { ok: true, json: async () => ({ assets: [] }) } as Response
        }
        if (url === "/api/app-v3/maya/recommendations") {
          return {
            ok: true,
            json: async () => ({
              recommendations: [
                {
                  title: "Your next photo",
                  rationale: "A clear next step",
                  format: "photo",
                  imageUrl: null,
                },
              ],
            }),
          } as Response
        }
        throw new Error(`Unexpected fetch: ${url}`)
      })
    )
  })

  it("makes For You open the visible recommendation instead of scrolling to its current position", async () => {
    renderCreate()
    await screen.findByText("Your next photo")

    fireEvent.click(screen.getByRole("button", { name: "For you" }))

    expect(mocks.openWithAesthetic).toHaveBeenCalledWith(
      expect.objectContaining({ id: "maya-decides" }),
      expect.objectContaining({
        referenceSelfieUrl: "https://example.com/member-selfie.jpg",
        creationIdea: expect.stringContaining("Your next photo"),
      })
    )
  })

  it("opens Saved Looks directly in Gallery Favorites", async () => {
    renderCreate()
    await screen.findByText("Your next photo")

    fireEvent.click(screen.getByRole("button", { name: "Saved looks" }))

    expect(mocks.openFavorites).toHaveBeenCalledTimes(1)
  })

  it("starts New and Inspiration with the returning member's saved identity", async () => {
    renderCreate()
    await screen.findByText("Your next photo")

    fireEvent.click(screen.getByRole("button", { name: "New" }))
    expect(mocks.openFresh).toHaveBeenCalledWith({
      referenceSelfieUrl: "https://example.com/member-selfie.jpg",
    })

    fireEvent.click(screen.getByRole("button", { name: "Inspiration" }))
    expect(mocks.openWithAesthetic).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "maya-general" }),
      expect.objectContaining({
        referenceSelfieUrl: "https://example.com/member-selfie.jpg",
        initialSetupAction: "inspiration_manager",
      })
    )
  })

  it("keeps identity in Another direction and Tell Maya starts", async () => {
    renderCreate()
    await screen.findByText("Your next photo")

    fireEvent.click(screen.getByRole("button", { name: /Look two/ }))
    expect(mocks.openWithAesthetic).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "look-two" }),
      expect.objectContaining({ referenceSelfieUrl: "https://example.com/member-selfie.jpg" })
    )

    fireEvent.change(screen.getByLabelText("Or start with your idea"), {
      target: { value: "A launch photo" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create my post" }))
    expect(mocks.openWithAesthetic).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "maya-decides" }),
      expect.objectContaining({ referenceSelfieUrl: "https://example.com/member-selfie.jpg" })
    )
  })

  it("uses Maya's visible recommendation when the member explicitly asks her to choose", async () => {
    renderCreate()
    await screen.findByText("Your next photo")

    fireEvent.change(screen.getByLabelText("Or start with your idea"), {
      target: { value: "I don't know what to post today. Maya, choose for me." },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create my post" }))

    expect(mocks.openWithAesthetic).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "maya-decides" }),
      expect.objectContaining({
        format: "photo",
        creationIntent: {
          format: "photo",
          source: "typed",
          confidence: "high",
        },
      })
    )
  })

  it("visibly disables Create actions while Maya is finishing active work", async () => {
    mocks.workspaceBusy = true
    renderCreate()
    await screen.findByText("Your next photo")

    expect(screen.getByText(/Maya is finishing your current task/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Create my post" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "New" })).toBeDisabled()
  })

  it("opens the existing readable memory surface directly from Create", async () => {
    renderCreate()
    await screen.findByText("Your next photo")

    fireEvent.click(screen.getByRole("button", { name: "What Maya knows" }))

    expect(screen.getByRole("dialog", { name: "What Maya remembers" })).toBeInTheDocument()
  })

  it("never repeats the hero image as an alternate direction", async () => {
    const { container } = renderCreate()
    await screen.findByText("Your next photo")
    await waitFor(() => {
      const visibleSources = Array.from(container.querySelectorAll("img")).map(image => image.src)
      expect(new Set(visibleSources).size).toBe(visibleSources.length)
    })
  })

  it("keeps Maya's desktop recommendation face-safe and above the fixed navigation", async () => {
    renderCreate()
    await screen.findByText("Your next photo")

    const recommendation = screen.getByRole("button", { name: /Your next photo/i })
    const image = recommendation.querySelector("img")

    expect(recommendation).toHaveAttribute("data-visual-card-layout", "editorial")
    expect(recommendation.className).toContain("lg:min-h-[340px]")
    expect(recommendation.className).toContain("lg:grid-cols-[minmax(0,1fr)_340px]")
    expect(image?.className).toContain("object-[50%_18%]")
    expect(image?.className).toContain("lg:object-[50%_0%]")
  })
})
