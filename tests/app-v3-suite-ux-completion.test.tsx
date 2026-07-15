import { fireEvent, render, screen } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { describe, expect, it, vi } from "vitest"
import { InlineResultActions } from "@/components/app-v3/maya-inline-components"

function read(path: string) {
  return readFileSync(path, "utf8")
}

describe("App v3 Suite UX completion", () => {
  it("gives a failed Calendar feed a working retry action", () => {
    const feedView = read("components/feed-planner/feed-view-screen.tsx")

    expect(feedView).toContain("Try again")
    expect(feedView).toContain("onClick={() => void mutateFeed()}")
  })

  it("names the Gallery image-to-video action by its outcome", () => {
    const gallery = read("components/app-v3/gallery-view.tsx")

    expect(gallery).toContain("Make video")
    expect(gallery).not.toMatch(/<Film[^>]*\/>\s*Move\s*<\/button>/)
  })

  it("celebrates a completed photo, Reel cover, and Stories campaign", () => {
    const onOpenCalendar = vi.fn()

    render(
      <InlineResultActions
        format="story-sequence"
        completedFormats={["photo", "reel-cover", "story-sequence"]}
        onNextFormat={vi.fn()}
        onOpenCalendar={onOpenCalendar}
      />
    )

    expect(screen.getByText("Campaign complete")).toBeInTheDocument()
    expect(screen.queryByText("Make the matching Reel cover")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Open Calendar" }))
    expect(onOpenCalendar).toHaveBeenCalledTimes(1)
  })

  it("wires completed formats and Calendar navigation through Maya", () => {
    const shell = read("components/app-v3/app-v3-shell.tsx")
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(shell).toContain('onOpenCalendar={() => goToSection("calendar")}')
    expect(concierge).toContain("completedFormats={Array.from(completedFormats)}")
    expect(concierge).toContain("onOpenCalendar={")
  })
})
