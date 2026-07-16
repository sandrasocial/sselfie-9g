import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  localMutate: vi.fn(),
  navigateToFeed: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  swrData: new Map<string, unknown>(),
  toast: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
  useSearchParams: () => ({ get: () => null }),
}))

vi.mock("swr", () => ({
  default: (key: string | null) => ({
    data: key ? mocks.swrData.get(key) : undefined,
    error: undefined,
    isLoading: false,
    isValidating: false,
    mutate: mocks.localMutate,
  }),
  mutate: mocks.localMutate,
}))

vi.mock("@/hooks/use-toast", () => ({
  toast: mocks.toast,
}))

vi.mock("@/components/feed-planner/feed-nav-context", () => ({
  useFeedNav: () => ({
    feedId: null,
    navigateToFeed: mocks.navigateToFeed,
  }),
}))

vi.mock("@/components/feed-planner/feed-style-modal", () => ({
  default: ({
    open,
    onConfirm,
  }: {
    open: boolean
    onConfirm: (data: {
      feedStyle: string
      feedStyleVariationId: number | null
      visualAesthetic: string[]
    }) => void
  }) =>
    open ? (
      <button
        type="button"
        onClick={() =>
          onConfirm({
            feedStyle: "Light & Minimalistic",
            feedStyleVariationId: 2,
            visualAesthetic: ["Editorial"],
          })
        }
      >
        Confirm grid style
      </button>
    ) : null,
}))

vi.mock("@/components/feed-planner/instagram-feed-view", () => ({
  default: () => <div>Existing grid</div>,
}))

vi.mock("@/components/sselfie/unified-loading", () => ({
  default: () => <div>Loading</div>,
}))

describe("Calendar grid creation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetch.mockReset()
    mocks.swrData.clear()
    global.fetch = mocks.fetch as unknown as typeof fetch
  })

  it("routes a no-grid member from the empty state into the newly created grid", async () => {
    mocks.swrData.set("/api/feed/latest", { exists: false })
    mocks.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ feedId: 101 }),
    })

    const { default: FeedViewScreen } = await import("@/components/feed-planner/feed-view-screen")

    render(<FeedViewScreen access={{ isMembership: true } as any} />)

    fireEvent.click(screen.getByRole("button", { name: /create my grid/i }))
    fireEvent.click(screen.getByRole("button", { name: /confirm grid style/i }))

    await waitFor(() => {
      expect(mocks.fetch).toHaveBeenCalledWith(
        "/api/feed/create-manual",
        expect.objectContaining({ method: "POST" }),
      )
      expect(mocks.navigateToFeed).toHaveBeenCalledWith(101)
    })
  })

  it("turns the paid welcome guide create action into a grid-creation action", async () => {
    mocks.swrData.set("/api/feed-planner/preview-feed", {
      hasPreviewFeed: false,
      previewImageUrl: null,
    })
    const onCreateFeed = vi.fn()
    const onComplete = vi.fn()
    const { default: WelcomeWizard } = await import("@/components/feed-planner/welcome-wizard")

    render(
      <WelcomeWizard
        open
        onComplete={onComplete}
        onCreateFeed={onCreateFeed}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Next" }))
    fireEvent.click(screen.getByRole("button", { name: "Next" }))
    fireEvent.click(screen.getAllByRole("button", { name: /create my first (feed|grid)/i })[0])

    expect(onCreateFeed).toHaveBeenCalledTimes(1)
    expect(onComplete).not.toHaveBeenCalled()
  })

  it("creates the first grid after the paid welcome guide style choice", async () => {
    mocks.swrData.set("/api/feed/latest", { exists: false })
    mocks.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ feedId: 151 }),
    })
    const onFeedStyleSelected = vi.fn()
    const { default: FeedViewScreen } = await import("@/components/feed-planner/feed-view-screen")

    render(
      <FeedViewScreen
        access={{ isPaidBlueprint: true } as any}
        controlledFeedStyleModal
        onFeedStyleModalChange={vi.fn()}
        onFeedStyleSelected={onFeedStyleSelected}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: /confirm grid style/i }))

    await waitFor(() => {
      expect(mocks.fetch).toHaveBeenCalledWith(
        "/api/feed/create-manual",
        expect.objectContaining({ method: "POST" }),
      )
      expect(mocks.navigateToFeed).toHaveBeenCalledWith(151)
      expect(onFeedStyleSelected).toHaveBeenCalledWith("Light & Minimalistic")
    })
  })

  it("keeps preview-style creation in the creation flow instead of dismissing it", async () => {
    mocks.swrData.set("/api/feed-planner/preview-feed", {
      hasPreviewFeed: true,
      previewImageUrl: "https://example.com/preview.jpg",
    })
    const onUsePreviewStyle = vi.fn()
    const onComplete = vi.fn()
    const { default: WelcomeWizard } = await import("@/components/feed-planner/welcome-wizard")

    render(
      <WelcomeWizard
        open
        onComplete={onComplete}
        onUsePreviewStyle={onUsePreviewStyle}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: /create feed using preview style/i }))

    expect(onUsePreviewStyle).toHaveBeenCalledTimes(1)
    expect(onComplete).not.toHaveBeenCalled()
  })

  it("creates another grid from the existing-grid header", async () => {
    mocks.swrData.set("/api/profile/personal-brand", {
      data: { settingsPreference: ["Light & Minimalistic"] },
    })
    mocks.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { settingsPreference: ["Light & Minimalistic"] } }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ feedId: 202 }) })

    const { default: FeedHeader } = await import("@/components/feed-planner/feed-header")

    render(
      <FeedHeader
        feedData={{ feed: { id: 7, title: "July" }, posts: [] }}
        currentFeedId={7}
        onProfileImageClick={vi.fn()}
        onWriteBio={vi.fn()}
        access={{ isPaidBlueprint: true }}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: /new (feed|grid)/i }))
    fireEvent.click(screen.getByRole("button", { name: /confirm grid style/i }))

    await waitFor(() => {
      expect(mocks.fetch).toHaveBeenCalledWith(
        "/api/feed/create-manual",
        expect.objectContaining({ method: "POST" }),
      )
      expect(mocks.navigateToFeed).toHaveBeenCalledWith(202)
    })
  })
})
