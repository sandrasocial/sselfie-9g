// @vitest-environment jsdom

import fs from "node:fs"
import path from "node:path"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  calendarPlanSettingsFromProfile,
  isCalendarPlanComplete,
} from "@/lib/feed-planner/calendar-plan-settings"

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8")

vi.mock("next/image", () => ({
  default: ({ fill: _fill, alt, ...props }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={typeof alt === "string" ? alt : ""} {...props} />
  ),
}))

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }))

describe("Calendar completion contract", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("keeps the full brand interview in Maya's shared content context", () => {
    const settings = calendarPlanSettingsFromProfile({
      data: {
        businessType: "Brand photography",
        idealAudience: "Women building personal brands",
        currentSituation: "Launch the membership",
        transformationStory: "I learned to build from my phone.",
        audienceChallenge: "They do not know what to post.",
        audienceTransformation: "They become visible and consistent.",
        futureVision: "A business that gives them more choices.",
        contentGoals: "Build trust and grow the membership.",
        contentPillars: ["Story", "Selfies", "Business"],
      },
    })

    expect(settings).toMatchObject({
      transformationStory: "I learned to build from my phone.",
      audienceChallenge: "They do not know what to post.",
      audienceTransformation: "They become visible and consistent.",
      futureVision: "A business that gives them more choices.",
      contentGoals: "Build trust and grow the membership.",
      contentPillars: ["Story", "Selfies", "Business"],
    })
    expect(isCalendarPlanComplete(settings)).toBe(true)
  })

  it("opens what Maya knows inside the shared Suite Calendar", async () => {
    const { CalendarContentContextModal } =
      await import("@/components/feed-planner/calendar-content-context-modal")

    render(
      <CalendarContentContextModal
        open
        settings={{
          businessType: "Brand photography",
          idealAudience: "Women building personal brands",
          currentSituation: "Grow the Suite membership",
          feedStyle: "",
        }}
        onClose={vi.fn()}
        onSave={vi.fn(async () => undefined)}
      />
    )

    expect(screen.getByRole("dialog", { name: /what maya knows/i })).toBeInTheDocument()
    expect(screen.getByText("Brand photography")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /update what maya knows/i })).toBeInTheDocument()
  })

  it("teaches the real flow visually and keeps the Instagram grid portrait-first", () => {
    const guide = read("components/feed-planner/welcome-wizard.tsx")
    const gridItem = read("components/feed-planner/feed-grid-item.tsx")

    expect(guide).toContain('data-guide-demo="choose-post"')
    expect(guide).toContain('data-guide-demo="maya-approval"')
    expect(guide).toContain('data-guide-demo="ready-to-post"')
    expect(guide).toContain("sticky bottom-0")
    expect(gridItem).toContain("aspect-[3/4]")
    expect(gridItem).toContain("object-top")
    expect(gridItem).not.toContain("object-[center_20%]")
  })

  it("adds rows through an owner-scoped endpoint and makes saved highlights interactive", () => {
    const header = read("components/feed-planner/feed-header.tsx")
    const rowsRoute = read("app/api/feed/[feedId]/rows/route.ts")

    expect(header).toContain("onAddRow")
    expect(header).toContain("onHighlightClick")
    expect(header).toContain("Add a row")
    expect(rowsRoute).toContain("AND user_id = ${neonUser.id}")
    expect(rowsRoute).toContain("MAX(position)")
    expect(rowsRoute).toContain("positionsCreated")
  })

  it("builds and saves more than one real story sequence from the member's Gallery", async () => {
    const onCreateWithMaya = vi.fn()
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === "/api/app-v3/gallery") {
        return {
          ok: true,
          json: async () => ({
            assets: [
              { id: "one", kind: "image", url: "https://example.com/one.jpg" },
              { id: "two", kind: "image", url: "https://example.com/two.jpg" },
            ],
          }),
        } as Response
      }
      if (url === "/api/feed/44/highlights" && init?.method === "POST") {
        return { ok: true, json: async () => ({ success: true }) } as Response
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })
    vi.stubGlobal("fetch", fetchMock)

    const { default: FeedHighlightsModal } =
      await import("@/components/feed-planner/feed-highlights-modal")
    render(
      <FeedHighlightsModal
        feedId={44}
        isOpen
        onClose={vi.fn()}
        onSave={vi.fn()}
        existingHighlights={[]}
        onCreateWithMaya={onCreateWithMaya}
      />
    )

    expect(await screen.findByRole("dialog", { name: /story studio/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /add story sequence/i }))
    fireEvent.change(await screen.findByLabelText(/sequence title/i), {
      target: { value: "About" },
    })
    fireEvent.click(screen.getByRole("button", { name: /add another sequence/i }))
    fireEvent.change(screen.getByLabelText(/sequence title/i), {
      target: { value: "Work" },
    })
    expect(screen.getByRole("button", { name: /about/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /work/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /create a cover with maya/i }))
    expect(onCreateWithMaya).toHaveBeenCalledWith("Work", true)

    fireEvent.click(screen.getAllByRole("button", { name: /use in sequence/i })[0])
    fireEvent.click(screen.getByRole("button", { name: /save story studio/i }))

    await waitFor(() => {
      const request = fetchMock.mock.calls.find(
        ([url, init]) => String(url) === "/api/feed/44/highlights" && init?.method === "POST"
      )
      expect(request).toBeTruthy()
      const payload = JSON.parse(String(request?.[1]?.body))
      expect(payload.highlights).toHaveLength(2)
      expect(
        payload.highlights.some((highlight: { description: string }) =>
          highlight.description.includes("slides")
        )
      ).toBe(true)
    })
  }, 10_000)

  it("starts a suggested Highlight with its title already filled in", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ assets: [] }) }))
    )
    const { default: FeedHighlightsModal } =
      await import("@/components/feed-planner/feed-highlights-modal")

    render(
      <FeedHighlightsModal
        feedId={44}
        isOpen
        onClose={vi.fn()}
        onSave={vi.fn()}
        existingHighlights={[]}
        initialSequenceTitle="About"
      />
    )

    expect(await screen.findByLabelText(/sequence title/i)).toHaveValue("About")
  })
})
