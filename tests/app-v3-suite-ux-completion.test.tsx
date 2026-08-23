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

  it("keeps refinement conversational instead of reopening format choices", () => {
    const onRefine = vi.fn()

    render(<InlineResultActions onRefine={onRefine} />)

    fireEvent.click(screen.getByRole("button", { name: /Make it more like me/ }))
    expect(onRefine).toHaveBeenCalledOnce()
    expect(screen.queryByText("Photos")).not.toBeInTheDocument()
    expect(screen.queryByText("Slides")).not.toBeInTheDocument()
    expect(screen.queryByText("Motion")).not.toBeInTheDocument()
  })

  it("keeps Maya focused while exposing the five plain-language destinations", () => {
    const shell = read("components/app-v3/app-v3-shell.tsx")
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const placementRoute = read("app/api/app-v3/maya/feed-plan/place-photo/route.ts")

    expect(shell).toContain('{ id: "create", label: "Create", icon: Sparkles }')
    expect(shell).toContain('{ id: "photos", label: "Gallery", icon: Images }')
    expect(shell).toContain('{ id: "calendar", label: "Calendar", icon: CalendarDays }')
    expect(shell).toContain('{ id: "library", label: "Learn", icon: LibraryBig }')
    expect(shell).toContain('{ id: "account", label: "Account", icon: UserRound }')
    expect(concierge).not.toContain('event: "suite_post_finished"')
    expect(placementRoute).toContain("saveMayaReadyPost")
    expect(concierge).toContain("suite_post_refinement_started")
    expect(concierge).not.toContain("completedFormats={Array.from(completedFormats)}")
  })
})
