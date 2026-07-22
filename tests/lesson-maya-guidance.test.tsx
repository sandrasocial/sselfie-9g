// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/font/google", () => ({
  Inter: () => ({ className: "inter" }),
}))

describe("Academy lesson Maya guidance adapter", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url !== "/api/app-v3/maya/guidance") {
          throw new Error(`Unexpected legacy request: ${url}`)
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            recommendation: "Publish one useful post before you wait for confidence.",
            reason: "Sandra teaches that confidence grows through showing up.",
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
              id: "guidance-action-lesson-10",
              taskId: "maya-learning-v1-1-10",
              kind: "continue_lesson",
              title: "Continue with Post Before You Feel Ready",
              reason: "Return to the action you chose.",
              target: { lessonId: 10 },
              creditCost: 0,
              requiresConfirmation: false,
              canUndo: false,
              idempotencyKey: "maya-action-guidance-lesson-10",
              status: "recommended",
            },
          }),
        } as Response
      })
    )
  })

  it("answers from the guidance endpoint with citations and the shared action card", async () => {
    const { LessonMayaChat } = await import("@/components/sselfie/academy/lesson-maya-chat")
    render(
      <LessonMayaChat
        courseId={1}
        lessonId={10}
        lessonTitle="Post Before You Feel Ready"
        courseTitle="Branded by SSELFIE"
        keyTakeaways={["Show up before you feel ready."]}
        actionStep={{ bold_move: "Publish one useful post." }}
        chosenActionLevel="bold_move"
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /ask maya/i }))
    fireEvent.click(screen.getByRole("button", { name: /do my bold move action/i }))

    expect(
      await screen.findByText(/Publish one useful post before you wait for confidence/i)
    ).toBeInTheDocument()
    expect(screen.getByText("Sources")).toBeInTheDocument()
    expect(screen.getByText("Post Before You Feel Ready")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Preview" })).toBeInTheDocument()
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
  })

  it("preserves the legacy lesson chat for members outside the rollout", async () => {
    const encoder = new TextEncoder()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404 } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode('0:"Legacy lesson answer"\n'))
            controller.close()
          },
        }),
      } as Response)
    vi.stubGlobal("fetch", fetchMock)

    const { LessonMayaChat } = await import("@/components/sselfie/academy/lesson-maya-chat")
    render(
      <LessonMayaChat
        courseId={1}
        lessonId={10}
        lessonTitle="Post Before You Feel Ready"
        courseTitle="Branded by SSELFIE"
        keyTakeaways={["Show up before you feel ready."]}
        actionStep={{}}
        chosenActionLevel={null}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /ask maya/i }))
    fireEvent.click(screen.getByRole("button", { name: /walk me through this/i }))

    expect(await screen.findByText("Legacy lesson answer")).toBeInTheDocument()
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/app-v3/maya/guidance", expect.any(Object))
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/maya/chat", expect.any(Object))
  })
})
