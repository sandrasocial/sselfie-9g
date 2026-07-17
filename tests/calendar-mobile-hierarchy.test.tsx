// @vitest-environment jsdom

import fs from "node:fs"
import path from "node:path"
import React from "react"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import FeedWeekView from "@/components/feed-planner/feed-week-view"

const repoRoot = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(repoRoot, file), "utf8")

afterEach(() => cleanup())

describe("Calendar mobile hierarchy", () => {
  it("opens directly on the workspace without a first-run explainer gate", () => {
    const plannerView = read("components/app-v3/feed-planner-view.tsx")

    expect(plannerView).not.toContain("CalendarExplainer")
    expect(plannerView).not.toContain("calendar:onboarding:v1")
    expect(plannerView).toContain("<FeedPlannerClient />")
  })

  it("names undated posts honestly and gives every row a useful label", () => {
    render(
      <FeedWeekView
        posts={[
          { id: 1, position: 1, caption: null },
          { id: 2, position: 2, caption: "A real caption" },
        ]}
        onPostClick={vi.fn()}
      />
    )

    expect(screen.getByRole("heading", { name: "Not scheduled" })).toBeTruthy()
    expect(screen.queryByText("Anytime")).toBeNull()
    expect(screen.getByText("Post 1")).toBeTruthy()
    expect(screen.getByText("Post 2")).toBeTruthy()
  })

  it("uses progressive disclosure and discoverable mobile navigation", () => {
    const thisWeek = read("components/app-v3/this-week-strip.tsx")
    const tabs = read("components/feed-planner/feed-tabs.tsx")
    const planner = read("components/feed-planner/instagram-feed-view.tsx")

    expect(thisWeek).toContain("snap-x")
    expect(thisWeek).toContain("line-clamp-2")
    expect(thisWeek).toContain("min-h-11")
    expect(thisWeek).toContain("flex-col items-start")
    expect(thisWeek).not.toContain('className="-mr-2 -mt-2')

    expect(tabs).toContain("Your grids")
    expect(tabs).toContain('aria-label="Choose a grid"')
    expect(tabs).toContain("min-h-11")

    expect(tabs).toContain('aria-label="Grid view"')
    expect(tabs).toContain('aria-label="Calendar view"')
    expect(tabs).not.toContain('["plan", "grid", "profile"]')
    expect(planner).toContain("rounded-none")
    expect(planner).toContain('useState<FeedTab>("grid")')
  })
})
