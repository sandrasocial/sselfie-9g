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
  trackAnalyticsEvent: vi.fn(),
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

vi.mock("@/lib/analytics/client", () => ({
  trackAnalyticsEvent: mocks.trackAnalyticsEvent,
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
    initialDirectionMode,
  }: {
    open: boolean
    initialDirectionMode?: string | null
    onConfirm: (data: {
      directionMode: "curated"
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
            directionMode: "curated",
            feedStyle: "Light & Minimalistic",
            feedStyleVariationId: 2,
            visualAesthetic: ["Editorial"],
          })
        }
      >
        Confirm {initialDirectionMode ?? "visual"} direction
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

  it("opens an Instagram-style empty canvas and creates the first grid from a visual direction", async () => {
    mocks.swrData.set("/api/feed/latest", { exists: false })
    mocks.swrData.set("/api/profile/personal-brand", {
      data: {
        businessType: "Coach",
        idealAudience: "Women founders",
        currentSituation: "Membership",
        settingsPreference: ["Light & Minimalistic"],
      },
    })
    mocks.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ feedId: 101 }),
    })

    const { default: FeedViewScreen } = await import("@/components/feed-planner/feed-view-screen")

    render(<FeedViewScreen access={{ isMembership: true } as any} />)

    expect(screen.getByRole("region", { name: /instagram grid/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /add photo to post/i })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /start with my own photos/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /choose my visual direction/i }))
    fireEvent.click(screen.getByRole("button", { name: /confirm visual direction/i }))

    await waitFor(() => {
      expect(mocks.fetch).toHaveBeenCalledWith(
        "/api/feed/create-manual",
        expect.objectContaining({ method: "POST" })
      )
      expect(mocks.navigateToFeed).toHaveBeenCalledWith(101)
    })
  })

  it("lets a new user choose the visual direction from Maya before any planning request", async () => {
    mocks.swrData.set("/api/feed/latest", { exists: false })
    mocks.swrData.set("/api/profile/personal-brand", { exists: false, completed: false })

    const { default: FeedViewScreen } = await import("@/components/feed-planner/feed-view-screen")

    render(<FeedViewScreen access={{ isMembership: true } as any} />)

    fireEvent.click(screen.getByRole("button", { name: /open maya for this calendar/i }))

    expect(screen.getByRole("region", { name: /instagram grid/i })).toBeInTheDocument()
    expect(
      screen.getByRole("complementary", { name: /maya for this calendar/i })
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Let Maya decide" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Use Sandra’s favourites" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Upload inspiration" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Describe the look I want" })).toBeInTheDocument()
    expect(screen.queryByRole("region", { name: /plan settings/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Use Sandra’s favourites" }))
    expect(screen.getByRole("button", { name: /confirm curated direction/i })).toBeInTheDocument()
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it("creates a manual grid only through the explicit own-photos action", async () => {
    mocks.swrData.set("/api/feed/latest", { exists: false })
    mocks.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ feedId: 102 }),
    })

    const { default: FeedViewScreen } = await import("@/components/feed-planner/feed-view-screen")

    render(<FeedViewScreen access={{ isMembership: true } as any} />)

    fireEvent.click(screen.getByRole("button", { name: /start with my own photos/i }))

    await waitFor(() => {
      expect(mocks.fetch).toHaveBeenCalledWith(
        "/api/feed/create-manual",
        expect.objectContaining({ method: "POST", body: "{}" })
      )
      expect(mocks.navigateToFeed).toHaveBeenCalledWith(102, { openPosition: 1 })
    })
  })

  it("gives paid-blueprint users the same grid-first entry", async () => {
    mocks.swrData.set("/api/feed/latest", { exists: false })

    const { default: FeedViewScreen } = await import("@/components/feed-planner/feed-view-screen")

    render(<FeedViewScreen access={{ isPaidBlueprint: true } as any} />)

    expect(screen.getByRole("region", { name: /instagram grid/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /start with my own photos/i })).toBeInTheDocument()
    expect(screen.getByRole("region", { name: /instagram grid/i })).toBeInTheDocument()
  })

  it("keeps the grid primary and moves planning into a secondary view", async () => {
    mocks.swrData.set("/api/feed/list", {
      feeds: [
        {
          id: 7,
          title: "July",
          created_at: "2026-07-01",
          layout_type: "grid_3x3",
          period_month: "2026-07",
          image_count: 3,
        },
        {
          id: 6,
          title: "June",
          created_at: "2026-06-01",
          layout_type: "grid_3x3",
          period_month: "2026-06",
          image_count: 9,
        },
      ],
    })
    const onTabChange = vi.fn()
    const { default: FeedTabs } = await import("@/components/feed-planner/feed-tabs")

    render(
      <FeedTabs
        activeTab="grid"
        onTabChange={onTabChange}
        access={{ isMembership: true } as any}
        currentFeedId={7}
      />
    )

    expect(screen.getByRole("button", { name: "Grid view" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    expect(screen.getByRole("button", { name: "Calendar view" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Profile" })).not.toBeInTheDocument()
    expect(screen.getByRole("group", { name: "Choose a grid" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Calendar view" }))
    expect(onTabChange).toHaveBeenCalledWith("plan")
  })

  it("turns the paid welcome guide create action into a grid-creation action", async () => {
    mocks.swrData.set("/api/feed-planner/preview-feed", {
      hasPreviewFeed: false,
      previewImageUrl: null,
    })
    const onCreateFeed = vi.fn()
    const onComplete = vi.fn()
    const { default: WelcomeWizard } = await import("@/components/feed-planner/welcome-wizard")

    render(<WelcomeWizard open onComplete={onComplete} onCreateFeed={onCreateFeed} />)

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
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /confirm visual direction/i }))

    await waitFor(() => {
      expect(mocks.fetch).toHaveBeenCalledWith(
        "/api/feed/create-manual",
        expect.objectContaining({ method: "POST" })
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

    render(<WelcomeWizard open onComplete={onComplete} onUsePreviewStyle={onUsePreviewStyle} />)

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
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /new (feed|grid)/i }))
    fireEvent.click(screen.getByRole("button", { name: /confirm visual direction/i }))

    await waitFor(() => {
      expect(mocks.fetch).toHaveBeenCalledWith(
        "/api/feed/create-manual",
        expect.objectContaining({ method: "POST" })
      )
      expect(mocks.navigateToFeed).toHaveBeenCalledWith(202)
    })
  })

  it("keeps visual direction and new-grid actions explicit for a fresh calendar", async () => {
    mocks.swrData.set("/api/profile/personal-brand", {
      data: { settingsPreference: [] },
    })
    mocks.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { settingsPreference: [] } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })

    const { default: FeedHeader } = await import("@/components/feed-planner/feed-header")

    render(
      <FeedHeader
        feedData={{ feed: { id: 7, title: "July" }, posts: [{ id: 1, image_url: null }] }}
        currentFeedId={7}
        onProfileImageClick={vi.fn()}
        onWriteBio={vi.fn()}
        access={{ isMembership: true }}
      />
    )

    expect(screen.getByRole("button", { name: /new (feed|grid)/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /visual direction/i }))
    fireEvent.click(screen.getByRole("button", { name: /confirm visual direction/i }))

    await waitFor(() => {
      expect(mocks.fetch).toHaveBeenCalledWith(
        "/api/feed/7/update-style",
        expect.objectContaining({ method: "PATCH" })
      )
      expect(mocks.fetch).not.toHaveBeenCalledWith("/api/feed/create-manual", expect.anything())
    })
  })
})
