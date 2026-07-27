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
        displayMode="embedded"
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

    expect(screen.getByRole("button", { name: "Open Maya for this Calendar" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Open Maya for this Calendar" }))
    expect(
      screen.getByRole("complementary", { name: "Maya for this Calendar" })
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Collapse Maya" }))
    expect(screen.getByRole("button", { name: "Open Maya for this Calendar" })).toBeInTheDocument()
  })

  it("contains the embedded workspace inside a narrow mobile post studio", async () => {
    const { CalendarMayaWorkspace } =
      await import("@/components/feed-planner/calendar-maya-workspace")
    render(
      <CalendarMayaWorkspace
        feedId={7}
        displayMode="embedded"
        selectedPost={{ id: 2, position: 2, caption: "Ready", hasImage: true }}
        feedSummary={{ title: "July", posts: [] }}
        onApplyProposal={vi.fn()}
        onUndo={vi.fn()}
      />
    )

    const workspace = screen.getByRole("complementary", { name: "Maya for this Calendar" })
    expect(workspace).toHaveClass("min-w-0", "w-full", "max-w-full")
    expect(screen.getAllByText("Post 2 selected")[1]?.parentElement?.parentElement).toHaveClass(
      "min-w-0",
      "flex-wrap"
    )
  })

  it("closes Plan Settings when the Maya sheet is collapsed", async () => {
    const closePlanSettings = vi.fn()
    const { CalendarMayaWorkspace } =
      await import("@/components/feed-planner/calendar-maya-workspace")
    render(
      <CalendarMayaWorkspace
        feedId={7}
        selectedPost={null}
        feedSummary={{ title: "July", posts: [] }}
        planSettings={{
          businessType: "Coach",
          idealAudience: "Women founders",
          currentSituation: "Membership",
          feedStyle: "Light & Minimalistic",
        }}
        onSavePlanSettings={vi.fn()}
        planSettingsOpen
        onPlanSettingsClosed={closePlanSettings}
        onApplyProposal={vi.fn()}
        onUndo={vi.fn()}
      />
    )

    await screen.findByRole("complementary", { name: "Maya for this Calendar" })
    fireEvent.click(screen.getByRole("button", { name: "Collapse Maya" }))

    expect(closePlanSettings).toHaveBeenCalledTimes(1)
  })

  it("recommends the next action from the selected post state", async () => {
    const { CalendarMayaWorkspace } =
      await import("@/components/feed-planner/calendar-maya-workspace")
    render(
      <CalendarMayaWorkspace
        feedId={7}
        displayMode="embedded"
        selectedPost={{ id: 44, position: 4, caption: "Caption ready", hasImage: false }}
        feedSummary={{ title: "July", posts: [] }}
        onApplyProposal={vi.fn()}
        onUndo={vi.fn()}
      />
    )

    expect(screen.getAllByText("Post 4 selected")).toHaveLength(2)
    expect(screen.getByText("Post 4 needs a photo. What should I do next?")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Create the image" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Use one from my Gallery" })).toBeInTheDocument()
    expect(screen.queryByText(/post 4 is planned/i)).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Build my month" })).not.toBeInTheDocument()
  })

  it("changes the next action for ready, generating, failed, and empty posts", async () => {
    const { CalendarMayaWorkspace } =
      await import("@/components/feed-planner/calendar-maya-workspace")
    const baseProps = {
      feedId: 7,
      displayMode: "embedded" as const,
      feedSummary: { title: "July", posts: [] },
      onApplyProposal: vi.fn(),
      onUndo: vi.fn(),
    }
    const { rerender } = render(
      <CalendarMayaWorkspace
        {...baseProps}
        selectedPost={{ id: 1, position: 1, caption: "Ready", hasImage: true }}
      />
    )

    expect(screen.getByText("Post 1 is ready. What would you like to adjust?")).toBeInTheDocument()

    rerender(
      <CalendarMayaWorkspace
        {...baseProps}
        selectedPost={{
          id: 1,
          position: 1,
          caption: "Ready",
          hasImage: true,
          generationStatus: "completed",
          predictionId: "historical-prediction-id",
        }}
      />
    )
    expect(screen.getByText("Post 1 is ready. What would you like to adjust?")).toBeInTheDocument()
    expect(screen.getByText("Photo ready")).toBeInTheDocument()

    rerender(
      <CalendarMayaWorkspace
        {...baseProps}
        selectedPost={{
          id: 2,
          position: 2,
          caption: null,
          hasImage: false,
          generationStatus: "generating",
        }}
      />
    )
    expect(
      screen.getByText("Post 2 is creating its image. What can we finish meanwhile?")
    ).toBeInTheDocument()

    rerender(
      <CalendarMayaWorkspace
        {...baseProps}
        selectedPost={{
          id: 3,
          position: 3,
          caption: "Caption ready",
          hasImage: false,
          generationStatus: "failed",
        }}
      />
    )
    expect(
      screen.getByText("Post 3 image did not finish. What should I do next?")
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Retry the image" })).toBeInTheDocument()

    rerender(
      <CalendarMayaWorkspace
        {...baseProps}
        selectedPost={{ id: 4, position: 4, caption: null, hasImage: false }}
      />
    )
    expect(
      screen.getByText("Post 4 needs an idea and caption. Where should I start?")
    ).toBeInTheDocument()
  })

  it("sends the current feed visual direction in the deterministic Calendar request", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "I have the current direction.", proposal: null }),
    })
    const { CalendarMayaWorkspace } =
      await import("@/components/feed-planner/calendar-maya-workspace")

    render(
      <CalendarMayaWorkspace
        feedId={7}
        displayMode="embedded"
        selectedPost={null}
        feedSummary={{
          title: "July",
          posts: [],
          visualDirectionMode: "custom",
          visualDirectionBrief: "Bright city mornings with silver details",
          inspirationImageUrl: "https://example.com/inspiration.jpg",
          feedStyle: "Light & Minimalistic",
          feedStyleVariationId: 14,
        }}
        onApplyProposal={vi.fn()}
        onUndo={vi.fn()}
      />
    )

    fireEvent.change(screen.getByLabelText("Message Maya about this grid"), {
      target: { value: "Does this post fit my direction?" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Send to Maya" }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(JSON.parse(String(request.body))).toEqual(
      expect.objectContaining({
        feedSummary: expect.objectContaining({
          visualDirectionMode: "custom",
          visualDirectionBrief: "Bright city mornings with silver details",
          inspirationImageUrl: "https://example.com/inspiration.jpg",
          feedStyle: "Light & Minimalistic",
          feedStyleVariationId: 14,
        }),
      })
    )
  })

  it("starts an untouched grid with visual direction instead of advanced plan advice", async () => {
    const chooseVisualDirection = vi.fn()
    const { CalendarMayaWorkspace } =
      await import("@/components/feed-planner/calendar-maya-workspace")

    render(
      <CalendarMayaWorkspace
        feedId={7}
        displayMode="embedded"
        selectedPost={null}
        feedSummary={{
          title: "July",
          bio: null,
          posts: Array.from({ length: 9 }, (_, index) => ({
            id: index + 1,
            position: index + 1,
            caption: null,
            hasImage: false,
          })),
        }}
        onChooseVisualDirection={chooseVisualDirection}
        onApplyProposal={vi.fn()}
        onUndo={vi.fn()}
      />
    )

    expect(screen.getByText(/start with the visual direction/i)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Adjust my content mix" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Let Maya decide" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Use Sandra’s favourites" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Upload inspiration" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Describe the look I want" })).toBeInTheDocument()
    expect(document.querySelectorAll("[data-direction-preview]")).toHaveLength(4)
    expect(
      screen.getByRole("link", { name: /find grid inspiration on pinterest/i })
    ).toHaveAttribute("href", expect.stringContaining("pinterest.com"))

    fireEvent.click(screen.getByRole("button", { name: "Upload inspiration" }))
    expect(chooseVisualDirection).toHaveBeenCalledWith("inspiration")
  })

  it("asks for real content context after a direction is saved", async () => {
    const openContentContext = vi.fn()
    const { CalendarMayaWorkspace } =
      await import("@/components/feed-planner/calendar-maya-workspace")

    render(
      <CalendarMayaWorkspace
        feedId={7}
        displayMode="embedded"
        selectedPost={null}
        feedSummary={{
          title: "July",
          posts: Array.from({ length: 9 }, (_, index) => ({
            id: index + 1,
            position: index + 1,
            caption: null,
            hasImage: false,
          })),
        }}
        hasVisualDirection
        hasContentContext={false}
        onOpenContentContext={openContentContext}
        onApplyProposal={vi.fn()}
        onUndo={vi.fn()}
      />
    )

    expect(screen.queryByRole("button", { name: "Let Maya decide" })).not.toBeInTheDocument()
    expect(screen.getByText(/visual direction is saved/i)).toBeInTheDocument()
    expect(screen.getAllByText(/without inventing your story/i)).toHaveLength(2)
    fireEvent.click(screen.getByRole("button", { name: /add my content context/i }))
    expect(openContentContext).toHaveBeenCalledTimes(1)
  })

  it("opens post 1 when an untouched grid has direction and context", async () => {
    const openPost = vi.fn()
    const { CalendarMayaWorkspace } =
      await import("@/components/feed-planner/calendar-maya-workspace")

    render(
      <CalendarMayaWorkspace
        feedId={7}
        displayMode="embedded"
        selectedPost={null}
        feedSummary={{
          title: "July",
          posts: Array.from({ length: 9 }, (_, index) => ({
            id: index + 1,
            position: index + 1,
            caption: null,
            hasImage: false,
          })),
        }}
        hasVisualDirection
        hasContentContext
        onOpenPostDetails={openPost}
        onApplyProposal={vi.fn()}
        onUndo={vi.fn()}
      />
    )

    expect(screen.queryByRole("button", { name: "Adjust my content mix" })).not.toBeInTheDocument()
    expect(screen.getByText(/let’s create your first post/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /open post 1/i }))
    expect(openPost).toHaveBeenCalledWith(1)
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
        activityLabel="Creating your blank grid"
        onApplyProposal={vi.fn()}
        onUndo={vi.fn()}
      />
    )

    expect(screen.getByRole("status")).toHaveTextContent("Creating your blank grid")
  })

  it("offers the four visual-direction paths before asking a new user to build anything", async () => {
    const chooseVisualDirection = vi.fn()
    const { CalendarMayaWorkspace } =
      await import("@/components/feed-planner/calendar-maya-workspace")
    render(
      <CalendarMayaWorkspace
        feedId={null}
        selectedPost={null}
        feedSummary={null}
        onChooseVisualDirection={chooseVisualDirection}
        onApplyProposal={vi.fn()}
        onUndo={vi.fn()}
      />
    )

    expect(screen.getByRole("button", { name: "Open Maya for this Calendar" })).toBeInTheDocument()
    expect(
      screen.queryByRole("complementary", { name: "Maya for this Calendar" })
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Open Maya for this Calendar" }))
    expect(screen.getByRole("button", { name: "Let Maya decide" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Use Sandra’s favourites" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Upload inspiration" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Describe the look I want" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Build my month" })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Let Maya decide" }))
    expect(chooseVisualDirection).toHaveBeenCalledWith("maya")
  })

  it("offers a fresh chat and a new grid without hiding either action", async () => {
    const createNewGrid = vi.fn()
    const { CalendarMayaWorkspace } =
      await import("@/components/feed-planner/calendar-maya-workspace")
    render(
      <CalendarMayaWorkspace
        feedId={7}
        displayMode="embedded"
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
        displayMode="embedded"
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
        displayMode="embedded"
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
