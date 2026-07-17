// @vitest-environment jsdom

import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import FeedWeekView from "@/components/feed-planner/feed-week-view"

describe("Calendar ready-post status", () => {
  it("shows whether each planned post is ready or what is still missing", () => {
    render(
      <FeedWeekView
        posts={[
          {
            id: 1,
            position: 1,
            image_url: "https://example.com/ready.jpg",
            caption: "Ready caption",
          },
          { id: 2, position: 2, image_url: "https://example.com/image-only.jpg", caption: null },
          { id: 3, position: 3, image_url: null, caption: "Caption first" },
        ]}
        onPostClick={vi.fn()}
      />
    )

    expect(screen.getByText("Ready")).toBeInTheDocument()
    expect(screen.getByText("Needs caption")).toBeInTheDocument()
    expect(screen.getByText("Needs photo")).toBeInTheDocument()
  })
})
