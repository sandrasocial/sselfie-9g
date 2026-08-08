import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { MayaFounderTestMode } from "@/components/app-v3/maya-founder-test-mode"

describe("Maya Founder Test Mode", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("captures one plain-language report and lets Sandra continue immediately", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        return new Response(
          JSON.stringify({
            report: {
              id: "feedback-1",
              reportType: "quality",
              message: "The answer is useful but still sounds generic.",
              status: "new",
              statusLabel: "Received",
              createdAt: "2026-08-08T12:00:00.000Z",
            },
          }),
          { status: 201, headers: { "content-type": "application/json" } }
        )
      }
      return new Response(JSON.stringify({ reports: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    })
    vi.stubGlobal("fetch", fetchMock)
    vi.stubGlobal("crypto", { randomUUID: () => "report-client-1" })

    render(
      <MayaFounderTestMode
        context={{
          surface: "create",
          taskId: "maya-task-1",
          chatId: "maya-chat-1",
          outputFormat: null,
          messages: [{ role: "assistant", parts: [{ type: "text", text: "How can I help?" }] }],
        }}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Report" }))
    expect(screen.getByRole("dialog", { name: "Report what felt wrong" })).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Not good enough" }))
    fireEvent.change(screen.getByRole("textbox", { name: "What happened?" }), {
      target: { value: "The answer is useful but still sounds generic." },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save and keep testing" }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const request = fetchMock.mock.calls[0]
    const form = request[1]?.body as FormData
    const payload = JSON.parse(String(form.get("payload")))
    expect(payload).toMatchObject({
      clientReportId: "report-client-1",
      reportType: "quality",
      message: "The answer is useful but still sounds generic.",
      context: {
        surface: "create",
        taskId: "maya-task-1",
        chatId: "maya-chat-1",
      },
    })
    expect(payload.context.recentMessages[0].text).toBe("How can I help?")
    expect(screen.queryByRole("dialog", { name: "Report what felt wrong" })).toBeNull()
    expect(screen.getByRole("status")).toHaveTextContent("Saved. Keep testing Maya.")
  })

  it("shows recent reports in the same lightweight sheet", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              reports: [
                {
                  id: "feedback-2",
                  reportType: "confusing",
                  message: "I did not know what Maya wanted me to do next.",
                  status: "deployed",
                  statusLabel: "Ready to retest",
                  createdAt: "2026-08-08T12:00:00.000Z",
                },
              ],
            }),
            { status: 200, headers: { "content-type": "application/json" } }
          )
      )
    )

    render(<MayaFounderTestMode context={{ surface: "create", messages: [] }} />)

    fireEvent.click(screen.getByRole("button", { name: "Report" }))
    fireEvent.click(screen.getByRole("button", { name: "Reports" }))

    expect(await screen.findByText("I did not know what Maya wanted me to do next.")).toBeVisible()
    expect(screen.getByText("Ready to retest")).toBeVisible()
  })
})
