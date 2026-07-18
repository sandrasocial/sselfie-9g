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
  })
})
