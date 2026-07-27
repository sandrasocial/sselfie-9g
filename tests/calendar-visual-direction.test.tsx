// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  swrData: new Map<string, unknown>(),
  mutate: vi.fn(),
}))

vi.mock("swr", () => ({
  default: (key: string | null) => ({
    data: key ? mocks.swrData.get(key) : undefined,
    isLoading: false,
    mutate: mocks.mutate,
  }),
}))

vi.mock("@/components/blueprint/blueprint-selfie-upload", () => ({
  BlueprintSelfieUpload: () => <div>Selfie references</div>,
}))

describe("Calendar visual direction", () => {
  beforeEach(() => {
    mocks.swrData.clear()
    mocks.swrData.set("/api/profile/personal-brand", {
      data: { settingsPreference: [] },
    })
  })

  it("offers all four ways to direct Maya before showing Sandra's seven favourites", async () => {
    const { default: FeedStyleModal } = await import("@/components/feed-planner/feed-style-modal")

    render(<FeedStyleModal open onOpenChange={vi.fn()} onConfirm={vi.fn()} mode="new" />)

    expect(screen.getByRole("button", { name: /maya decides/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /sandra's favourites/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /upload inspiration/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /describe it myself/i })).toBeInTheDocument()
    expect(document.querySelectorAll("[data-direction-preview]")).toHaveLength(4)
    expect(screen.queryByRole("button", { name: /dark & moody/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /sandra's favourites/i }))

    for (const style of [
      "Dark & Moody",
      "Beige Aesthetic",
      "Light & Minimalistic",
      "Luxury Future Self",
      "Casual Bohemian",
      "Athletic & Wellness",
      "Coastal Aesthetics",
    ]) {
      expect(screen.getByRole("button", { name: new RegExp(style, "i") })).toBeInTheDocument()
    }
    expect(screen.getByText("Updated from the saved preview library")).toBeInTheDocument()
  })

  it("makes Pinterest and upload guidance part of the inspiration path", async () => {
    const { default: FeedStyleModal } = await import("@/components/feed-planner/feed-style-modal")

    render(
      <FeedStyleModal
        open
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        mode="new"
        initialDirectionMode="inspiration"
      />
    )

    expect(
      screen.getByText(/save or screenshot a grid, photo, outfit, room, or colour world/i)
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /open pinterest for inspiration/i })).toHaveAttribute(
      "target",
      "_blank"
    )
    expect(screen.getByLabelText("Upload an inspiration image")).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,image/webp"
    )
  })

  it("accepts a user's own description without forcing a preset", async () => {
    const confirm = vi.fn()
    const { default: FeedStyleModal } = await import("@/components/feed-planner/feed-style-modal")

    render(<FeedStyleModal open onOpenChange={vi.fn()} onConfirm={confirm} mode="new" />)

    fireEvent.click(screen.getByRole("button", { name: /describe it myself/i }))
    fireEvent.change(screen.getByLabelText("Describe your visual direction"), {
      target: { value: "Bright city mornings, silver details and confident movement" },
    })
    fireEvent.click(screen.getByRole("button", { name: /create my grid/i }))

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        directionMode: "custom",
        visualDirectionBrief: "Bright city mornings, silver details and confident movement",
      })
    )
  })

  it("reopens a saved custom direction instead of looking unsaved", async () => {
    const { default: FeedStyleModal } = await import("@/components/feed-planner/feed-style-modal")

    render(
      <FeedStyleModal
        open
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        mode="style"
        initialDirectionMode="custom"
        initialVisualDirectionBrief="Bright city mornings, silver details and confident movement"
      />
    )

    expect(screen.getByRole("button", { name: /describe it myself/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    expect(screen.getByLabelText("Describe your visual direction")).toHaveValue(
      "Bright city mornings, silver details and confident movement"
    )
    expect(screen.getByRole("button", { name: /save direction/i })).toBeEnabled()
  })

  it("reopens a saved inspiration image instead of asking for it again", async () => {
    const { default: FeedStyleModal } = await import("@/components/feed-planner/feed-style-modal")

    render(
      <FeedStyleModal
        open
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        mode="style"
        initialDirectionMode="inspiration"
        initialInspirationImageUrl="https://example.com/saved-inspiration.jpg"
      />
    )

    expect(screen.getByRole("button", { name: /upload inspiration/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    expect(screen.getByAltText("Selected inspiration")).toHaveAttribute(
      "src",
      expect.stringContaining("saved-inspiration.jpg")
    )
    expect(screen.getByRole("button", { name: /save direction/i })).toBeEnabled()
  })

  it("traps focus and closes the visual-direction dialog with Escape", async () => {
    const onOpenChange = vi.fn()
    const { default: FeedStyleModal } = await import("@/components/feed-planner/feed-style-modal")

    render(<FeedStyleModal open onOpenChange={onOpenChange} onConfirm={vi.fn()} mode="new" />)

    await waitFor(() => expect(screen.getByRole("button", { name: "Close" })).toHaveFocus())
    fireEvent.keyDown(window, { key: "Escape" })

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
