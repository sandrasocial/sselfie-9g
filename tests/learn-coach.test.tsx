// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const track = vi.fn()

vi.mock("next/image", () => ({
  default: ({ fill: _fill, alt, ...props }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={typeof alt === "string" ? alt : ""} {...props} />
  ),
}))

vi.mock("@/lib/analytics/client", () => ({ trackAnalyticsEvent: track }))

describe("Maya Learn Coach", () => {
  beforeEach(() => {
    track.mockReset()
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url === "/api/app-v3/library") {
          return {
            ok: true,
            json: async () => ({
              membershipActive: true,
              courses: [
                {
                  id: 1,
                  title: "Personal Brand Masterclass",
                  description: "Build a clear brand and content plan.",
                  lessonCount: 8,
                  completedLessons: 2,
                  progressPercentage: 25,
                  started: true,
                  href: "/academy/courses/1/lessons/3",
                },
              ],
              ownedProducts: [],
              lockedProducts: [],
              drops: [],
              learningPlan: null,
            }),
          } as Response
        }
        if (url === "/api/app-v3/library/plan" && init?.method === "POST") {
          return { ok: true, json: async () => ({ success: true }) } as Response
        }
        if (url === "/api/app-v3/maya/guidance" && init?.method === "POST") {
          const payload = JSON.parse(String(init.body || "{}"))
          return {
            ok: true,
            json: async () => ({
              recommendation: "Publish one useful teaching post before you wait for confidence.",
              reason: "Sandra teaches that showing up creates confidence.",
              sourceRefs: [
                {
                  kind: "lesson",
                  courseId: 1,
                  lessonId: 10,
                  title: "Post Before You Feel Ready",
                  version: "1234567890abcdef",
                },
              ],
              nextAction: {
                id: "guidance-action-10",
                taskId: payload.taskId,
                kind: "continue_lesson",
                title: "Continue with Post Before You Feel Ready",
                reason: "This is the most useful next lesson.",
                target: { lessonId: 10 },
                creditCost: 0,
                requiresConfirmation: false,
                canUndo: false,
                idempotencyKey: "maya-action-guidance-lesson-10",
                status: "recommended",
              },
            }),
          } as Response
        }
        throw new Error(`Unexpected fetch: ${url}`)
      })
    )
  })

  it("turns an owned lesson into one saved next step and a direct product handoff", async () => {
    const onOpenMaya = vi.fn()
    const onOpenCalendar = vi.fn()
    const { LibraryView } = await import("@/components/app-v3/library-view")

    render(<LibraryView onOpenMaya={onOpenMaya} onOpenCalendar={onOpenCalendar} />)

    expect(await screen.findByRole("heading", { name: /maya coach/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /i don't know what to post/i }))

    expect((await screen.findAllByText(/personal brand masterclass/i)).length).toBeGreaterThan(1)
    fireEvent.click(screen.getByRole("button", { name: /save this plan/i }))
    await waitFor(() =>
      expect(track).toHaveBeenCalledWith(expect.objectContaining({ event: "learn_plan_saved" }))
    )

    fireEvent.click(screen.getByRole("button", { name: /plan it in calendar/i }))
    expect(onOpenCalendar).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole("button", { name: /use it with maya/i }))
    expect(onOpenMaya).toHaveBeenCalledWith(
      "Help me use what I learned in Personal Brand Masterclass to create one useful piece of content."
    )
  })

  it("uses source-backed guidance and hands the exact lesson task to Maya", async () => {
    const onOpenMaya = vi.fn()
    const { LibraryView } = await import("@/components/app-v3/library-view")

    render(<LibraryView operatingLayerEnabled onOpenMaya={onOpenMaya} />)
    expect(await screen.findByRole("heading", { name: /maya coach/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /i don't know what to post/i }))

    expect(await screen.findByText("Post Before You Feel Ready")).toBeInTheDocument()
    expect(screen.getByText(/From Post Before You Feel Ready/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /use it with maya/i }))

    expect(onOpenMaya).toHaveBeenCalledWith(
      expect.objectContaining({
        courseId: 1,
        lessonId: 10,
        lessonTitle: "Post Before You Feel Ready",
      })
    )
  })

  it("retries the failed guidance request without reloading the Library", async () => {
    let guidanceRequests = 0
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === "/api/app-v3/library") {
        return {
          ok: true,
          json: async () => ({
            membershipActive: true,
            courses: [],
            ownedProducts: [],
            lockedProducts: [],
            drops: [],
            learningPlan: null,
          }),
        } as Response
      }
      if (url === "/api/app-v3/maya/guidance" && init?.method === "POST") {
        guidanceRequests += 1
        if (guidanceRequests === 1) return { ok: false, status: 503 } as Response
        const payload = JSON.parse(String(init.body || "{}"))
        return {
          ok: true,
          json: async () => ({
            recommendation: "Publish one useful teaching post.",
            reason: "Sandra teaches that showing up creates confidence.",
            sourceRefs: [
              {
                kind: "lesson",
                courseId: 1,
                lessonId: 10,
                title: "Post Before You Feel Ready",
                version: "1234567890abcdef",
              },
            ],
            nextAction: {
              id: "guidance-action-10",
              taskId: payload.taskId,
              kind: "continue_lesson",
              title: "Continue with Post Before You Feel Ready",
              reason: "This is the most useful next lesson.",
              target: { lessonId: 10 },
              creditCost: 0,
              requiresConfirmation: false,
              canUndo: false,
              idempotencyKey: "maya-action-guidance-lesson-10",
              status: "recommended",
            },
          }),
        } as Response
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })
    vi.stubGlobal("fetch", fetchMock)
    const { LibraryView } = await import("@/components/app-v3/library-view")

    render(<LibraryView operatingLayerEnabled />)
    expect(await screen.findByRole("heading", { name: /maya coach/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /i don't know what to post/i }))
    expect(await screen.findByText(/Maya couldn't find your next lesson/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /^retry$/i }))

    expect(await screen.findByText("Post Before You Feel Ready")).toBeInTheDocument()
    expect(guidanceRequests).toBe(2)
    expect(fetchMock.mock.calls.filter(([input]) => String(input) === "/api/app-v3/library")).toHaveLength(
      1
    )
  })
})
