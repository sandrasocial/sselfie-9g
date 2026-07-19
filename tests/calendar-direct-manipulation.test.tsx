// @vitest-environment jsdom

import fs from "node:fs"
import path from "node:path"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import FeedWeekView from "@/components/feed-planner/feed-week-view"

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8")

describe("Calendar direct manipulation", () => {
  it("opens the Instagram post studio directly from grid and Calendar cards", () => {
    const source = read("components/feed-planner/instagram-feed-view.tsx")
    const openPostStudio = source.slice(
      source.indexOf("const openPostStudio ="),
      source.indexOf("const refreshCalendar =")
    )

    expect(source).toContain("const openPostStudio =")
    expect(openPostStudio).toContain("setSelectedPost(post)")
    expect(openPostStudio).not.toContain("navigateToMaya")
    expect(source).toContain("onPostClick={openPostStudio}")
    expect(source).not.toContain("Tap a post to select it")
  })

  it("renders each week as a horizontal, swipeable Instagram-card carousel", () => {
    const onPostClick = vi.fn()
    render(
      <FeedWeekView
        posts={[
          {
            id: 1,
            position: 1,
            image_url: "https://example.com/one.jpg",
            caption: "A complete caption that belongs underneath the image.",
            content_pillar: "Useful lesson",
            scheduled_at: "2026-07-20T10:00:00.000Z",
          },
          {
            id: 2,
            position: 2,
            image_url: null,
            caption: "A second caption",
            content_pillar: "Offer",
            scheduled_at: "2026-07-22T10:00:00.000Z",
          },
        ]}
        onPostClick={onPostClick}
      />
    )

    const carousel = screen.getByRole("list", { name: /posts for week of july 20/i })
    expect(carousel.className).toContain("overflow-x-auto")
    expect(carousel.className).toContain("snap-x")

    const firstCard = screen.getByRole("button", { name: /open post 1/i })
    expect(firstCard.className).toContain("snap-start")
    expect(within(firstCard).getByText(/complete caption/i)).toBeInTheDocument()
    expect(firstCard.querySelector('[data-post-image="true"]')?.className).toContain("aspect-[4/5]")

    fireEvent.click(firstCard)
    expect(onPostClick).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
  })

  it("keeps Maya inside the post studio and collapses the standalone assistant on arrival", () => {
    const modals = read("components/feed-planner/feed-modals.tsx")
    const workspace = read("components/feed-planner/calendar-maya-workspace.tsx")

    expect(modals).toContain('aria-label="Post studio view"')
    expect(modals).toContain("Ask Maya")
    expect(modals).toContain("mayaWorkspace")
    expect(workspace).toContain('displayMode = "sidebar"')
    expect(workspace).toContain('displayMode === "embedded"')
    expect(workspace).toContain("busy && feedId === null")
  })

  it("keeps the new-grid picker interactive above the post studio", () => {
    const postStudio = read("components/feed-planner/feed-modals.tsx")
    const stylePicker = read("components/feed-planner/feed-style-modal.tsx")

    expect(postStudio).toContain("z-[110]")
    expect(stylePicker).toContain("z-[120]")
    expect(stylePicker).toContain("z-[121]")
  })

  it("uses a face-safe focal point for square grid previews", () => {
    const gridItem = read("components/feed-planner/feed-grid-item.tsx")
    const week = read("components/feed-planner/feed-week-view.tsx")

    expect(gridItem).toContain("object-[center_20%]")
    expect(week).toContain("object-[center_20%]")
  })
})
