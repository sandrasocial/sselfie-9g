import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import MayaGeneratedAssetCard from "@/components/sselfie/maya/maya-generated-asset-card"

const originalFetch = global.fetch

describe("MayaGeneratedAssetCard", () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it("renders a rich calendar preview from fetched asset metadata", async () => {
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        asset: {
          id: "maya_calendar_1",
          assetType: "calendar",
          title: "Launch Calendar",
          instruction: "Create a content calendar",
          previewText: "9-post IG calendar for launch week.",
          previewHtml: "<html></html>",
          previewData: {
            kind: "calendar",
            monthLabel: "March 2026",
            summary: "9-post IG calendar for launch week.",
            posts: [
              {
                id: "post-1",
                dayLabel: "Monday",
                postType: "Carousel",
                hook: "Why this launch matters",
                overlay: "Launch Story",
                imageUrl: "https://cdn.example.com/post-1.jpg",
              },
            ],
          },
          createdAt: "2026-03-10T10:00:00.000Z",
          status: "draft",
          url: "/p/sandra/calendar-1",
        },
      }),
    })

    render(
      <MayaGeneratedAssetCard
        assetType="calendar"
        assetLabel="Content Calendar"
        assetId="maya_calendar_1"
        previewText="Draft created"
        url="/p/sandra/calendar-1"
      />,
    )

    await waitFor(() => {
      expect(screen.getByText("Launch Calendar")).toBeInTheDocument()
    })

    expect(screen.getByText("March 2026")).toBeInTheDocument()
    expect(screen.getByText("Why this launch matters")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /preview draft/i })).toHaveAttribute("href", "/maya/asset/maya_calendar_1")
  })

  it("falls back gracefully when draft metadata fails to load", async () => {
    ;(global.fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "No draft available" }),
    })

    render(
      <MayaGeneratedAssetCard
        assetType="page"
        assetLabel="Landing Page"
        assetId="maya_page_1"
        previewText="Draft created"
      />,
    )

    await waitFor(() => {
      expect(screen.getByText("No draft available")).toBeInTheDocument()
    })
  })
})
