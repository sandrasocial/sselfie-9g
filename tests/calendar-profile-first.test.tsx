// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  navigateToFeed: vi.fn(),
  swrData: new Map<string, unknown>(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("swr", () => ({
  default: (key: string | null) => ({
    data: key ? mocks.swrData.get(key) : undefined,
    isLoading: false,
  }),
  mutate: vi.fn(),
}))

vi.mock("@/components/feed-planner/feed-nav-context", () => ({
  useFeedNav: () => ({ navigateToFeed: mocks.navigateToFeed }),
}))

vi.mock("@/components/feed-planner/feed-style-modal", () => ({
  default: () => null,
}))

describe("Calendar Instagram profile", () => {
  beforeEach(() => {
    mocks.swrData.clear()
    mocks.swrData.set("/api/profile/personal-brand", {
      data: { settingsPreference: ["Light & Minimalistic"] },
    })
  })

  it("keeps profile, bio and highlight creation visible before the first image", async () => {
    const createBio = vi.fn()
    const createHighlights = vi.fn()
    const { default: FeedHeader } = await import("@/components/feed-planner/feed-header")

    render(
      <FeedHeader
        feedData={{
          feed: { id: 7, title: "July", username: "sandrasstudio" },
          userDisplayName: "Sandra",
          posts: Array.from({ length: 9 }, (_, index) => ({ id: index + 1 })),
          bio: null,
          highlights: [],
        }}
        currentFeedId={7}
        onProfileImageClick={vi.fn()}
        onWriteBio={createBio}
        onCreateHighlights={createHighlights}
        access={{ isMembership: true }}
      />
    )

    expect(screen.getByRole("heading", { name: "sandrasstudio" })).toBeInTheDocument()
    expect(screen.getByText("Sandra")).toBeInTheDocument()
    expect(screen.getByText(/add a short bio so people know what you do/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /create bio with maya/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /create highlights with maya/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "New grid" })).toHaveClass(
      "text-[color:var(--app-btn-primary-text)]"
    )
    expect(screen.getByRole("button", { name: /create highlights with maya/i })).toHaveTextContent(
      "New"
    )
    expect(screen.getByText("About")).toBeInTheDocument()
    expect(screen.getByText("Work")).toBeInTheDocument()
    expect(screen.getByText("Life")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /create bio with maya/i }))
    fireEvent.click(screen.getByRole("button", { name: /create highlights with maya/i }))
    expect(createBio).toHaveBeenCalledTimes(1)
    expect(createHighlights).toHaveBeenCalledTimes(1)
  })

  it("uses the member's saved identity instead of legacy Calendar placeholders", async () => {
    const { default: FeedHeader } = await import("@/components/feed-planner/feed-header")

    render(
      <FeedHeader
        feedData={{
          feed: { id: 7, title: "July", username: "yourbrand", profile_image_url: null },
          userDisplayName: "Sandra",
          sharedProfileImageUrl: "https://example.com/sandra.jpg",
          posts: [],
          bio: null,
          highlights: [],
        }}
        currentFeedId={7}
        onProfileImageClick={vi.fn()}
        onWriteBio={vi.fn()}
        onCreateHighlights={vi.fn()}
        access={{ isMembership: true }}
      />
    )

    expect(screen.getByRole("heading", { name: "sandra" })).toBeInTheDocument()
    expect(screen.getByRole("img", { name: "Sandra's profile" })).toHaveAttribute(
      "src",
      expect.stringContaining(encodeURIComponent("https://example.com/sandra.jpg"))
    )
  })

  it("opens each suggested Highlight as a real Story Studio starting point", async () => {
    const createHighlight = vi.fn()
    const { default: FeedHeader } = await import("@/components/feed-planner/feed-header")

    render(
      <FeedHeader
        feedData={{
          feed: { id: 7, title: "July" },
          userDisplayName: "Sandra",
          posts: [],
          bio: null,
          highlights: [],
        }}
        currentFeedId={7}
        onWriteBio={vi.fn()}
        onCreateHighlights={vi.fn()}
        onCreateHighlight={createHighlight}
        access={{ isMembership: true }}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /start about story sequence/i }))
    expect(createHighlight).toHaveBeenCalledWith("About")
  })
})
