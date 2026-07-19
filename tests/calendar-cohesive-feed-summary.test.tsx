// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import FeedMonthSummary from "@/components/feed-planner/feed-month-summary"

describe("Calendar feed story summary", () => {
  it("explains how the feed works without adding another setup step", () => {
    render(
      <FeedMonthSummary
        themeSummary="A calm month that builds trust before the offer."
        schedulingRationale="Three useful posts each week."
        feedStory="Founder, useful teaching, real work, proof, then the offer."
        visualRhythm="People, details, working moments, and quiet text covers."
        pillars={["Founder", "Teaching", "Offer"]}
        posts={[
          {
            id: 1,
            position: 1,
            purpose: "connect",
            shot_type: "portrait",
            pro_mode_type: "workbench",
            visual_direction: "A strong opening portrait",
          },
          {
            id: 2,
            position: 2,
            purpose: "teach",
            shot_type: "detail",
            pro_mode_type: "carousel-slides",
            visual_direction: "A useful teaching carousel",
          },
          {
            id: 3,
            position: 3,
            purpose: "process",
            shot_type: "working",
            pro_mode_type: "reel-cover",
            visual_direction: "Show the work in progress",
          },
        ]}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /about this month/i }))

    expect(screen.getByText("How this feed works")).toBeInTheDocument()
    expect(screen.getByText(/founder, useful teaching/i)).toBeInTheDocument()
    expect(screen.getByText(/people, details, working moments/i)).toBeInTheDocument()
    expect(screen.getByText("Use what you already have first.")).toBeInTheDocument()
    expect(screen.getByText("Carousel")).toBeInTheDocument()
    expect(screen.getByText("Reel cover")).toBeInTheDocument()
    expect(screen.getByText("Post 1")).toBeInTheDocument()
    expect(screen.getByText("Post 3")).toBeInTheDocument()
  })
})
