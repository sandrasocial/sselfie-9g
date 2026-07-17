// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const fetchMock = vi.fn()

describe("Maya Calendar workspace", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    global.fetch = fetchMock as unknown as typeof fetch
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
})
