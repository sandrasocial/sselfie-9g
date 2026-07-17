// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const fetchMock = vi.fn()
let storage: Map<string, string>

describe("Maya Calendar workspace", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    global.fetch = fetchMock as unknown as typeof fetch
    storage = new Map()
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
      },
    })
  })

  it("shows Maya beside the grid and previews a change before applying it", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: "I tightened the caption for **post 4**.",
        proposal: {
          kind: "update_caption",
          label: "Update post 4 caption",
          postId: 44,
          caption: "A clearer caption that sounds like her.",
        },
      }),
    })
    const apply = vi.fn().mockResolvedValue({ undoAvailable: true })
    const undo = vi.fn().mockResolvedValue(undefined)
    const { CalendarMayaWorkspace } =
      await import("@/components/feed-planner/calendar-maya-workspace")

    render(
      <CalendarMayaWorkspace
        feedId={7}
        selectedPost={{ id: 44, position: 4, caption: "Old caption" }}
        feedSummary={{ title: "July", posts: [] }}
        onApplyProposal={apply}
        onUndo={undo}
      />
    )

    fireEvent.change(screen.getByLabelText("Message Maya about this grid"), {
      target: { value: "Make this caption sound more like me" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Send to Maya" }))

    expect(await screen.findByText("post 4")).toHaveProperty("tagName", "STRONG")
    expect(screen.getByText("A clearer caption that sounds like her.")).toBeInTheDocument()
    expect(apply).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Apply change" }))
    await waitFor(() => expect(apply).toHaveBeenCalledWith(expect.objectContaining({ postId: 44 })))

    fireEvent.click(screen.getByRole("button", { name: "Undo change" }))
    await waitFor(() => expect(undo).toHaveBeenCalledTimes(1))
  }, 10_000)

  it("keeps the grid visible when the mobile Maya sheet is collapsed", async () => {
    const { CalendarMayaWorkspace } =
      await import("@/components/feed-planner/calendar-maya-workspace")
    render(
      <CalendarMayaWorkspace
        feedId={7}
        selectedPost={null}
        feedSummary={{ title: "July", posts: [] }}
        onApplyProposal={vi.fn()}
        onUndo={vi.fn()}
      />
    )

    expect(
      screen.getByRole("complementary", { name: "Maya for this Calendar" })
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Collapse Maya" }))
    expect(screen.getByRole("button", { name: "Open Maya for this Calendar" })).toBeInTheDocument()
  })

  it("changes shared inline suggestions when an empty post is selected", async () => {
    const { CalendarMayaWorkspace } =
      await import("@/components/feed-planner/calendar-maya-workspace")
    render(
      <CalendarMayaWorkspace
        feedId={7}
        selectedPost={{ id: 44, position: 4, caption: "Caption ready", hasImage: false }}
        feedSummary={{ title: "July", posts: [] }}
        planSettings={{
          businessType: "Photographer",
          idealAudience: "Women founders",
          currentSituation: "Membership",
          feedStyle: "Light & Minimalistic",
        }}
        onSavePlanSettings={vi.fn()}
        onApplyProposal={vi.fn()}
        onUndo={vi.fn()}
      />
    )

    expect(screen.getAllByText("Post 4 selected")).toHaveLength(2)
    fireEvent.click(screen.getByRole("button", { name: "Use this plan" }))
    expect(screen.getByRole("button", { name: "Create this image" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Use one from my Gallery" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Build my month" })).not.toBeInTheDocument()
  })

  it("shows visible progress while Maya prepares a first grid", async () => {
    const { CalendarMayaWorkspace } =
      await import("@/components/feed-planner/calendar-maya-workspace")
    render(
      <CalendarMayaWorkspace
        feedId={null}
        selectedPost={null}
        feedSummary={null}
        busy
        onBuildFirstGrid={vi.fn()}
        onApplyProposal={vi.fn()}
        onUndo={vi.fn()}
      />
    )

    expect(screen.getByRole("status")).toHaveTextContent(
      "Maya is mapping your month and drafting the captions"
    )
  })

  it("offers a fresh chat and a new grid without hiding either action", async () => {
    const createNewGrid = vi.fn()
    const { CalendarMayaWorkspace } =
      await import("@/components/feed-planner/calendar-maya-workspace")
    render(
      <CalendarMayaWorkspace
        feedId={7}
        selectedPost={null}
        feedSummary={{ title: "July", posts: [] }}
        onCreateNewGrid={createNewGrid}
        onApplyProposal={vi.fn()}
        onUndo={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "New" }))
    expect(screen.getByRole("button", { name: "New chat" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "New grid" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "New grid" }))
    expect(createNewGrid).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole("button", { name: "New" }))
    fireEvent.click(screen.getByRole("button", { name: "New chat" }))
    expect(screen.getByRole("button", { name: "Start fresh" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Start fresh" }))

    expect(screen.getByText(/i’ve got your month open/i)).toBeInTheDocument()
    expect(window.localStorage.getItem("calendar:maya-thread:v1:7")).toBeNull()
  })

  it("never carries a malformed or empty thread into another grid", async () => {
    window.localStorage.setItem(
      "calendar:maya-thread:v1:7",
      JSON.stringify([{ id: "old", role: "assistant", content: "Old grid conversation" }])
    )
    window.localStorage.setItem("calendar:maya-thread:v1:8", JSON.stringify([]))
    const { CalendarMayaWorkspace } =
      await import("@/components/feed-planner/calendar-maya-workspace")
    const { rerender } = render(
      <CalendarMayaWorkspace
        feedId={7}
        selectedPost={null}
        feedSummary={{ title: "July", posts: [] }}
        onApplyProposal={vi.fn()}
        onUndo={vi.fn()}
      />
    )

    expect(await screen.findByText("Old grid conversation")).toBeInTheDocument()
    rerender(
      <CalendarMayaWorkspace
        feedId={8}
        selectedPost={null}
        feedSummary={{ title: "August", posts: [] }}
        onApplyProposal={vi.fn()}
        onUndo={vi.fn()}
      />
    )

    await waitFor(() => expect(screen.queryByText("Old grid conversation")).not.toBeInTheDocument())
    expect(screen.getByText(/i’ve got your month open/i)).toBeInTheDocument()
  })
})
