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

  it("keeps the Gallery grid free of per-thumbnail video promotion", () => {
    const gallery = read("components/app-v3/gallery-view.tsx")
    const shell = read("components/app-v3/app-v3-shell.tsx")

    expect(gallery).not.toContain("Make video")
    expect(gallery).toContain("onMakeMotion?: (url: string) => void")
    expect(gallery).toContain("onMakeMotion(asset.url)")
    expect(read("components/app-v3/image-lightbox.tsx")).toContain("Make video")
    expect(shell).toContain("onMakeMotion={videoEnabled ? createMotionFromImage : undefined}")
    expect(shell).toContain("videoSourceUrl: imageUrl")
  })

  it("lets the Gallery overflow panel escape its thumbnail while open", () => {
    const gallery = read("components/app-v3/gallery-view.tsx")

    expect(gallery).toContain('actionsOpen ? "z-30 overflow-visible" : "overflow-hidden"')
    expect(gallery).toContain("bg-[#0D0E10] text-white shadow-sm")
    expect(gallery).toContain("focus-visible:ring-inset focus-visible:ring-white")
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

  it("offers calm direct entry points for Carousel and Stories", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(concierge).toContain('onClick={() => onPickFormat("carousel")}')
    expect(concierge).toContain('onClick={() => onPickFormat("story-sequence")}')
    expect(concierge).toContain("onPickFormat={handlePickFormat}")
  })

  it("keeps multi-slide generation on the complete JSON path and recovers lost responses", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(concierge).toContain("stream: !wantsBakedText && isSingleImageRequest")
    expect(concierge).toContain("recoverMultiImageFromGallery")
    expect(concierge).toContain('targetFormat !== "carousel" && targetFormat !== "story-sequence"')
    expect(concierge).toContain('restorePaidMultiImage("request_recovered", recoveryAttempts)')
  })

  it("does not reserve a duplicate Maya sidebar inside the Suite Calendar", () => {
    const calendar = read("components/feed-planner/instagram-feed-view.tsx")
    const calendarScreen = read("components/feed-planner/feed-view-screen.tsx")

    expect(calendar).toContain("calendarMayaWorkspace")
    expect(calendar).toContain('"lg:grid-cols-[minmax(0,58rem)] lg:justify-center"')
    expect(calendarScreen).toContain("!usesSharedSuiteMaya && (")
    expect(calendarScreen).toContain("<CalendarMayaWorkspace")
  })

  it("contains the entire generated visual in a bounded inline preview", () => {
    const conceptCard = read("components/app-v3/concept-card.tsx")

    expect(conceptCard).toContain("const FRAME_MAX_WIDTH")
    expect(conceptCard).toContain('"story-sequence": "max-w-[18rem]"')
    expect(conceptCard).toContain("object-contain")
  })
})
